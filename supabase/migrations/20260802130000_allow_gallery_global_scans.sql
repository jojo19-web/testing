-- Global Scan sharing is supported for every analysis surface. Disease-request
-- photos remain camera-only because that flow has a separate provenance and
-- rights contract.

alter table public.scan_contributions
  drop constraint if exists scan_contributions_source_check;
alter table public.scan_contributions
  add constraint scan_contributions_source_check
  check (source in ('live', 'capture', 'gallery'));

alter table public.global_share_intents
  drop constraint if exists global_share_intents_source_check;
alter table public.global_share_intents
  add constraint global_share_intents_source_check
  check (source in ('live', 'capture', 'gallery'));

-- Keep the service-role RPCs defensive even if a future caller bypasses the
-- Next.js validator. Existing rows remain unchanged; only the allowed source
-- domain is expanded.
create or replace function public.reserve_global_share_intent(
  p_owner_id uuid,
  p_client_scan_id uuid,
  p_disease_id text,
  p_confidence numeric,
  p_source text,
  p_model_version text,
  p_photo_path text,
  p_expected_sha256 text,
  p_rate_subject text
)
returns table (intent_path text, outcome text)
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
  if p_source not in ('live', 'capture', 'gallery') then
    raise exception using errcode = '22023', message = 'invalid share source';
  end if;
  if p_rate_subject !~ '^[a-f0-9]{64}$' or p_expected_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'invalid intent security metadata';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('ip:' || p_rate_subject, 0));
  perform pg_advisory_xact_lock(hashtextextended('owner:' || p_owner_id::text, 0));

  select * into existing
  from public.global_share_intents
  where owner_id = p_owner_id and client_scan_id = p_client_scan_id;
  if found then
    if existing.disease_id <> p_disease_id
      or existing.confidence <> p_confidence
      or existing.source <> p_source
      or existing.model_version <> p_model_version
      or existing.photo_path <> p_photo_path
      or existing.expected_sha256 <> p_expected_sha256 then
      return query select existing.photo_path, 'conflict'::text;
      return;
    end if;
    if existing.status = 'completed' then
      return query select existing.photo_path, 'completed'::text;
      return;
    end if;
  end if;

  if not exists (
    select 1 from public.installations
    where owner_id = p_owner_id and sharing_enabled
  ) then
    return query select null::text, 'consent_required'::text;
    return;
  end if;

  if exists (
    select 1
    from public.storage_cleanup_outbox
    where owner_id = p_owner_id
      and bucket_id = 'eggplant-scans'
      and object_path = p_photo_path
      and reason = 'sharing_consent_disabled'
  ) then
    return query select p_photo_path, 'cleanup_pending'::text;
    return;
  end if;

  if existing.id is not null then
    if existing.status = 'pending'
      and existing.created_at >= now() - interval '2 hours' then
      return query select existing.photo_path, 'existing'::text;
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
    return query select null::text, 'quota'::text;
    return;
  end if;

  if renewing then
    update public.global_share_intents set
      status = 'pending',
      created_at = now(),
      updated_at = now()
    where owner_id = p_owner_id and client_scan_id = p_client_scan_id;
  else
    insert into public.global_share_intents (
      owner_id, client_scan_id, disease_id, confidence, source, model_version,
      photo_path, expected_sha256
    ) values (
      p_owner_id, p_client_scan_id, p_disease_id, p_confidence, p_source, p_model_version,
      p_photo_path, p_expected_sha256
    );
  end if;

  insert into public.api_rate_limits (action, window_start, subject_hash, request_count)
  values ('global_share_intent', current_date, p_rate_subject, 1)
  on conflict (action, window_start, subject_hash) do update
    set request_count = public.api_rate_limits.request_count + 1, updated_at = now();

  return query select p_photo_path, case when renewing then 'renewed' else 'created' end;
end;
$$;

create or replace function public.create_scan_contribution_with_quota(
  p_owner_id uuid,
  p_client_scan_id uuid,
  p_disease_id text,
  p_confidence numeric,
  p_source text,
  p_model_version text,
  p_photo_path text
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
  if p_source not in ('live', 'capture', 'gallery') then
    raise exception using errcode = '22023', message = 'invalid share source';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('owner:' || p_owner_id::text, 0));

  select * into existing
  from public.scan_contributions
  where owner_id = p_owner_id and client_scan_id = p_client_scan_id;
  if found then
    if existing.disease_id = p_disease_id
      and existing.confidence = p_confidence
      and existing.source = p_source
      and existing.model_version = p_model_version
      and existing.photo_path = p_photo_path then
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
    or intent.confidence <> p_confidence
    or intent.source <> p_source
    or intent.model_version <> p_model_version
    or intent.photo_path <> p_photo_path
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
    owner_id, client_scan_id, disease_id, confidence, source, model_version, photo_path, status
  ) values (
    p_owner_id, p_client_scan_id, p_disease_id, p_confidence, p_source, p_model_version, p_photo_path, 'published'
  ) returning * into created;

  update public.global_share_intents set status = 'completed', updated_at = now()
    where owner_id = p_owner_id and client_scan_id = p_client_scan_id;

  return query select created.id, created.status, created.published_at, 'created'::text;
end;
$$;
