d-- Global Scan annotations are an additive second representation of the same
-- user-consented contribution. The raw photo remains the canonical upload and
-- stays compatible with clients released before this migration.

alter table public.scan_contributions
  add column annotated_photo_path text check (
    annotated_photo_path is null or (
      char_length(annotated_photo_path) between 1 and 1024
      and annotated_photo_path !~ '(^/|(^|/)\.\.(/|$)|[[:cntrl:]])'
    )
  );

alter table public.global_share_intents
  add column annotated_photo_path text check (
    annotated_photo_path is null or (
      char_length(annotated_photo_path) between 1 and 1024
      and annotated_photo_path !~ '(^/|(^|/)\.\.(/|$)|[[:cntrl:]])'
    )
  ),
  add column annotated_expected_sha256 text check (
    annotated_expected_sha256 is null or annotated_expected_sha256 ~ '^[a-f0-9]{64}$'
  );

alter table public.deletion_request_targets
  add column annotated_photo_path text check (
    annotated_photo_path is null or (
      char_length(annotated_photo_path) between 1 and 1024
      and annotated_photo_path !~ '(^/|(^|/)\.\.(/|$)|[[:cntrl:]])'
    )
  );

-- Backfill only the new representation. The raw path was already queued by
-- the storage cleanup migration, so existing cancellation records are not
-- duplicated.
insert into public.storage_cleanup_outbox (
  bucket_id,
  owner_id,
  object_path,
  reason
)
select
  'eggplant-scans',
  owner_id,
  annotated_photo_path,
  'sharing_consent_disabled'
from public.global_share_intents
where status = 'cancelled'
  and annotated_photo_path is not null
on conflict (bucket_id, object_path, reason) do nothing;

-- Keep consent cancellation cleanup durable for both image representations.
create or replace function public.set_sharing_consent(
  p_owner_id uuid,
  p_enabled boolean,
  p_consent_version integer
)
returns table (sharing_enabled boolean, cancelled_paths text[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise insufficient_privilege using message = 'service role required';
  end if;
  if p_enabled is null
    or (p_enabled and p_consent_version is distinct from 1)
    or (not p_enabled and p_consent_version is not null) then
    raise exception using errcode = '22023', message = 'invalid sharing consent';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('owner:' || p_owner_id::text, 0));

  update public.installations set
    sharing_enabled = p_enabled,
    consent_version = case when p_enabled then p_consent_version else null end,
    consented_at = case when p_enabled then now() else null end,
    last_seen_at = now()
  where owner_id = p_owner_id;
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception using errcode = 'P0002', message = 'installation not found';
  end if;

  if not p_enabled then
    with cancelled as (
      update public.global_share_intents
      set status = 'cancelled', updated_at = now()
      where owner_id = p_owner_id and status = 'pending'
      returning owner_id, photo_path, annotated_photo_path
    ), paths as (
      select owner_id, photo_path as object_path from cancelled
      union all
      select owner_id, annotated_photo_path as object_path
      from cancelled
      where annotated_photo_path is not null
    )
    insert into public.storage_cleanup_outbox (
      bucket_id,
      owner_id,
      object_path,
      reason
    )
    select
      'eggplant-scans',
      paths.owner_id,
      paths.object_path,
      'sharing_consent_disabled'
    from paths
    on conflict (bucket_id, object_path, reason) do update set
      owner_id = excluded.owner_id,
      state = case
        when public.storage_cleanup_outbox.state = 'processing'
          then public.storage_cleanup_outbox.state
        else 'pending'
      end,
      next_attempt_at = case
        when public.storage_cleanup_outbox.state = 'processing'
          then public.storage_cleanup_outbox.next_attempt_at
        else now()
      end,
      locked_at = case
        when public.storage_cleanup_outbox.state = 'processing'
          then public.storage_cleanup_outbox.locked_at
        else null
      end,
      last_error_code = case
        when public.storage_cleanup_outbox.state = 'processing'
          then public.storage_cleanup_outbox.last_error_code
        else null
      end,
      updated_at = now();

    select coalesce(
      array_agg(outstanding.object_path order by outstanding.next_attempt_at, outstanding.created_at, outstanding.id),
      array[]::text[]
    )
    into cancelled_paths
    from (
      select cleanup.id, cleanup.object_path, cleanup.next_attempt_at, cleanup.created_at
      from public.storage_cleanup_outbox as cleanup
      where cleanup.owner_id = p_owner_id
        and cleanup.bucket_id = 'eggplant-scans'
        and cleanup.reason = 'sharing_consent_disabled'
      order by cleanup.next_attempt_at, cleanup.created_at, cleanup.id
      limit 100
    ) as outstanding;
  end if;

  return query select p_enabled, coalesce(cancelled_paths, array[]::text[]);
end;
$$;

-- New clients reserve both object paths and both expected hashes atomically.
-- The original reserve function is intentionally left untouched for old APKs.
create or replace function public.reserve_global_share_intent_v2(
  p_owner_id uuid,
  p_client_scan_id uuid,
  p_disease_id text,
  p_confidence numeric,
  p_source text,
  p_model_version text,
  p_photo_path text,
  p_expected_sha256 text,
  p_annotated_photo_path text,
  p_annotated_expected_sha256 text,
  p_rate_subject text
)
returns table (intent_path text, annotated_intent_path text, outcome text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.global_share_intents%rowtype;
  ip_count integer;
  renewing boolean := false;
begin
  if (select auth.role()) <> 'service_role' then
    raise insufficient_privilege using message = 'service role required';
  end if;
  if p_owner_id is null
    or p_client_scan_id is null
    or p_source is null
    or p_source not in ('live', 'capture', 'gallery')
    or p_rate_subject is null
    or p_rate_subject !~ '^[a-f0-9]{64}$'
    or p_expected_sha256 is null
    or p_expected_sha256 !~ '^[a-f0-9]{64}$'
    or p_annotated_photo_path is null
    or p_annotated_expected_sha256 is null
    or p_annotated_expected_sha256 !~ '^[a-f0-9]{64}$'
    or p_photo_path is null
    or p_photo_path !~ ('^global/' || p_owner_id::text || '/' || p_client_scan_id::text || '/[a-f0-9]{64}[.]jpg$')
    or p_annotated_photo_path !~ ('^global/' || p_owner_id::text || '/' || p_client_scan_id::text || '/annotated-[a-f0-9]{64}[.]jpg$') then
    raise exception using errcode = '22023', message = 'invalid annotated intent security metadata';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('ip:' || p_rate_subject, 0));
  perform pg_advisory_xact_lock(hashtextextended('owner:' || p_owner_id::text, 0));

  select * into existing
  from public.global_share_intents
  where owner_id = p_owner_id and client_scan_id = p_client_scan_id;
  if found then
    if existing.disease_id <> p_disease_id
      or abs(existing.confidence - p_confidence) > 0.00005
      or existing.source <> p_source
      or existing.model_version <> p_model_version
      or existing.photo_path <> p_photo_path
      or existing.expected_sha256 <> p_expected_sha256
      or existing.annotated_photo_path is distinct from p_annotated_photo_path
      or existing.annotated_expected_sha256 is distinct from p_annotated_expected_sha256 then
      return query select existing.photo_path, existing.annotated_photo_path, 'conflict'::text;
      return;
    end if;
    if existing.status = 'completed' then
      return query select existing.photo_path, existing.annotated_photo_path, 'completed'::text;
      return;
    end if;
  end if;

  if not exists (
    select 1 from public.installations
    where owner_id = p_owner_id and sharing_enabled
  ) then
    return query select null::text, null::text, 'consent_required'::text;
    return;
  end if;

  if exists (
    select 1
    from public.storage_cleanup_outbox
    where owner_id = p_owner_id
      and bucket_id = 'eggplant-scans'
      and object_path = any(array[p_photo_path, p_annotated_photo_path]::text[])
      and reason = 'sharing_consent_disabled'
  ) then
    return query select p_photo_path, p_annotated_photo_path, 'cleanup_pending'::text;
    return;
  end if;

  if existing.id is not null then
    if existing.status = 'pending'
      and existing.created_at >= now() - interval '2 hours' then
      return query select existing.photo_path, existing.annotated_photo_path, 'existing'::text;
      return;
    end if;
    renewing := true;
  end if;

  select coalesce(request_count, 0) into ip_count
  from public.api_rate_limits
  where action = 'global_share_intent'
    and window_start = current_date
    and subject_hash = p_rate_subject;
  if (select count(*) from public.global_share_intents
      where owner_id = p_owner_id and created_at >= now() - interval '24 hours') >= 20
    or coalesce(ip_count, 0) >= 60 then
    return query select null::text, null::text, 'quota'::text;
    return;
  end if;

  if renewing then
    update public.global_share_intents set
      status = 'pending',
      photo_path = p_photo_path,
      expected_sha256 = p_expected_sha256,
      annotated_photo_path = p_annotated_photo_path,
      annotated_expected_sha256 = p_annotated_expected_sha256,
      created_at = now(),
      updated_at = now()
    where owner_id = p_owner_id and client_scan_id = p_client_scan_id;
  else
    insert into public.global_share_intents (
      owner_id, client_scan_id, disease_id, confidence, source, model_version,
      photo_path, expected_sha256, annotated_photo_path, annotated_expected_sha256
    ) values (
      p_owner_id, p_client_scan_id, p_disease_id, p_confidence, p_source, p_model_version,
      p_photo_path, p_expected_sha256, p_annotated_photo_path, p_annotated_expected_sha256
    );
  end if;

  insert into public.api_rate_limits (action, window_start, subject_hash, request_count)
  values ('global_share_intent', current_date, p_rate_subject, 1)
  on conflict (action, window_start, subject_hash) do update
    set request_count = public.api_rate_limits.request_count + 1, updated_at = now();

  return query select p_photo_path, p_annotated_photo_path, case when renewing then 'renewed' else 'created' end;
end;
$$;

create or replace function public.create_scan_contribution_with_quota_v2(
  p_owner_id uuid,
  p_client_scan_id uuid,
  p_disease_id text,
  p_confidence numeric,
  p_source text,
  p_model_version text,
  p_photo_path text,
  p_annotated_photo_path text
)
returns table (
  contribution_id uuid,
  contribution_status text,
  contribution_published_at timestamptz,
  outcome text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.scan_contributions%rowtype;
  created public.scan_contributions%rowtype;
  intent public.global_share_intents%rowtype;
begin
  if (select auth.role()) <> 'service_role' then
    raise insufficient_privilege using message = 'service role required';
  end if;
  if p_owner_id is null
    or p_client_scan_id is null
    or p_source is null
    or p_source not in ('live', 'capture', 'gallery')
    or p_photo_path is null
    or p_annotated_photo_path is null
    or p_photo_path !~ ('^global/' || p_owner_id::text || '/' || p_client_scan_id::text || '/[a-f0-9]{64}[.]jpg$')
    or p_annotated_photo_path !~ ('^global/' || p_owner_id::text || '/' || p_client_scan_id::text || '/annotated-[a-f0-9]{64}[.]jpg$') then
    raise exception using errcode = '22023', message = 'invalid annotated contribution metadata';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('owner:' || p_owner_id::text, 0));

  select * into existing
  from public.scan_contributions
  where owner_id = p_owner_id and client_scan_id = p_client_scan_id;
  if found then
    if existing.disease_id = p_disease_id
      and abs(existing.confidence - p_confidence) <= 0.00005
      and existing.source = p_source
      and existing.model_version = p_model_version
      and existing.photo_path = p_photo_path
      and existing.annotated_photo_path is not distinct from p_annotated_photo_path then
      update public.global_share_intents set status = 'completed', updated_at = now()
        where owner_id = p_owner_id and client_scan_id = p_client_scan_id;
      return query select existing.id, existing.status, existing.published_at, 'existing'::text;
    else
      return query select existing.id, existing.status, existing.published_at, 'conflict'::text;
    end if;
    return;
  end if;

  select * into intent
  from public.global_share_intents
  where owner_id = p_owner_id and client_scan_id = p_client_scan_id;
  if not found
    or intent.status <> 'pending'
    or intent.disease_id <> p_disease_id
    or abs(intent.confidence - p_confidence) > 0.00005
    or intent.source <> p_source
    or intent.model_version <> p_model_version
    or intent.photo_path <> p_photo_path
    or intent.annotated_photo_path is distinct from p_annotated_photo_path
    or intent.created_at < now() - interval '2 hours' then
    return query select null::uuid, null::text, null::timestamptz, 'invalid_intent'::text;
    return;
  end if;

  if not exists (
    select 1 from public.installations
    where owner_id = p_owner_id and sharing_enabled
  ) then
    return query select null::uuid, null::text, null::timestamptz, 'consent_required'::text;
    return;
  end if;

  insert into public.scan_contributions (
    owner_id, client_scan_id, disease_id, confidence, source, model_version,
    photo_path, annotated_photo_path, status
  ) values (
    p_owner_id, p_client_scan_id, intent.disease_id, intent.confidence,
    intent.source, intent.model_version, intent.photo_path, intent.annotated_photo_path, 'published'
  ) returning * into created;

  update public.global_share_intents set status = 'completed', updated_at = now()
    where owner_id = p_owner_id and client_scan_id = p_client_scan_id;

  return query select created.id, created.status, created.published_at, 'created'::text;
end;
$$;

-- Include both representations in immutable cloud-deletion snapshots.
create or replace function public.request_shared_cloud_deletion_v2(p_owner_id uuid)
returns table (
  deletion_id uuid,
  deletion_status text,
  affected_contribution_ids uuid[],
  cancelled_paths text[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.deletion_requests%rowtype;
  request_id uuid;
  snapshot_exists boolean;
  unpublished_ids uuid[] := array[]::uuid[];
  cleanup_paths text[] := array[]::text[];
begin
  if (select auth.role()) <> 'service_role' or p_owner_id is null then
    raise insufficient_privilege using message = 'service role required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('owner:' || p_owner_id::text, 0));

  select consent.cancelled_paths into cleanup_paths
  from public.set_sharing_consent(p_owner_id, false, null) as consent
  limit 1;

  select * into request_row
  from public.deletion_requests
  where owner_id = p_owner_id and status in ('queued', 'processing', 'failed')
  order by created_at desc, id desc
  limit 1
  for update;

  if found then
    request_id := request_row.id;
    if request_row.status = 'failed' then
      update public.deletion_requests
      set status = 'queued', last_error_code = null
      where id = request_id;
      request_row.status := 'queued';
    end if;
    select exists(
      select 1 from public.deletion_request_targets where deletion_request_id = request_id
    ) into snapshot_exists;
  else
    insert into public.deletion_requests (
      owner_id, status, scope, unpublished_at, last_error_code
    ) values (
      p_owner_id, 'queued', 'shared', now(), null
    ) returning id into request_id;
    request_row.status := 'queued';
    snapshot_exists := false;
  end if;

  if not snapshot_exists then
    insert into public.deletion_request_targets (
      deletion_request_id, resource_type, resource_id, photo_path, annotated_photo_path
    )
    select request_id, 'scan_contribution', contribution.id, contribution.photo_path, contribution.annotated_photo_path
    from public.scan_contributions as contribution
    where contribution.owner_id = p_owner_id
    union all
    select request_id, 'global_share_intent', intent.id, intent.photo_path, intent.annotated_photo_path
    from public.global_share_intents as intent
    where intent.owner_id = p_owner_id
    on conflict do nothing;

    with unpublished as (
      update public.scan_contributions
      set status = 'removed'
      where owner_id = p_owner_id
        and status in ('published', 'quarantined')
      returning id
    )
    select coalesce(array_agg(id order by id), array[]::uuid[]) into unpublished_ids
    from unpublished;
  end if;

  return query select
    request_id,
    request_row.status,
    unpublished_ids,
    coalesce(cleanup_paths, array[]::text[]);
end;
$$;

create or replace function public.acknowledge_storage_cleanup(
  p_cleanup_id uuid,
  p_succeeded boolean,
  p_error_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleanup public.storage_cleanup_outbox%rowtype;
  retry_seconds integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise insufficient_privilege using message = 'service role required';
  end if;
  if p_succeeded is null
    or p_cleanup_id is null
    or (not p_succeeded and coalesce(p_error_code, '') !~ '^[a-z0-9_:-]{1,100}$') then
    raise exception using errcode = '22023', message = 'invalid cleanup acknowledgement';
  end if;

  select * into cleanup
  from public.storage_cleanup_outbox
  where id = p_cleanup_id
  for update;
  if not found then return true; end if;
  if cleanup.state <> 'processing' then return false; end if;

  if p_succeeded then
    delete from public.storage_cleanup_outbox where id = cleanup.id;
    if cleanup.reason = 'sharing_consent_disabled' then
      delete from public.global_share_intents
      where status = 'cancelled'
        and (photo_path = cleanup.object_path or annotated_photo_path = cleanup.object_path);
    end if;
    return true;
  end if;

  retry_seconds := least(
    86400,
    (30 * power(2, least(greatest(cleanup.attempt_count - 1, 0), 11)))::integer
  );
  update public.storage_cleanup_outbox set
    state = 'retry',
    next_attempt_at = now() + make_interval(secs => retry_seconds),
    locked_at = null,
    last_error_code = p_error_code,
    updated_at = now()
  where id = cleanup.id;
  return true;
end;
$$;

create or replace function public.acknowledge_storage_cleanup_paths(
  p_owner_id uuid,
  p_bucket_id text,
  p_paths text[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise insufficient_privilege using message = 'service role required';
  end if;
  if p_bucket_id <> 'eggplant-scans'
    or p_owner_id is null
    or p_paths is null
    or cardinality(p_paths) not between 1 and 100
    or exists (
      select 1 from unnest(p_paths) as cleanup_path(path)
      where path is null or char_length(path) not between 1 and 1024
    ) then
    raise exception using errcode = '22023', message = 'invalid cleanup paths';
  end if;

  delete from public.storage_cleanup_outbox
  where bucket_id = p_bucket_id
    and owner_id = p_owner_id
    and reason = 'sharing_consent_disabled'
    and object_path = any(p_paths);
  get diagnostics affected = row_count;

  delete from public.global_share_intents
  where owner_id = p_owner_id
    and status = 'cancelled'
    and (photo_path = any(p_paths) or annotated_photo_path = any(p_paths));
  return affected;
end;
$$;

revoke all on function public.set_sharing_consent(uuid, boolean, integer) from public, anon, authenticated;
revoke all on function public.reserve_global_share_intent_v2(uuid, uuid, text, numeric, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.create_scan_contribution_with_quota_v2(uuid, uuid, text, numeric, text, text, text, text) from public, anon, authenticated;
revoke all on function public.request_shared_cloud_deletion_v2(uuid) from public, anon, authenticated;
revoke all on function public.acknowledge_storage_cleanup(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.acknowledge_storage_cleanup_paths(uuid, text, text[]) from public, anon, authenticated;

grant execute on function public.set_sharing_consent(uuid, boolean, integer) to service_role;
grant execute on function public.reserve_global_share_intent_v2(uuid, uuid, text, numeric, text, text, text, text, text, text, text) to service_role;
grant execute on function public.create_scan_contribution_with_quota_v2(uuid, uuid, text, numeric, text, text, text, text) to service_role;
grant execute on function public.request_shared_cloud_deletion_v2(uuid) to service_role;
grant execute on function public.acknowledge_storage_cleanup(uuid, boolean, text) to service_role;
grant execute on function public.acknowledge_storage_cleanup_paths(uuid, text, text[]) to service_role;
