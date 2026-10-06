-- Global photos are private until an administrator approves them.
alter table public.scan_contributions
  drop constraint if exists scan_contributions_status_check;

alter table public.scan_contributions
  add constraint scan_contributions_status_check
  check (status in ('pending_review', 'published', 'quarantined', 'removed', 'expired'));

create or replace function app_private.require_global_scan_approval()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- New contributions must never become public before human review.
  new.status := 'pending_review';
  return new;
end;
$$;

revoke all on function app_private.require_global_scan_approval() from public, anon, authenticated;

create trigger require_global_scan_approval
before insert on public.scan_contributions
for each row execute function app_private.require_global_scan_approval();

-- Contributions enter the ranking ledger only after an administrator approves.
create trigger record_global_ranking_after_approval
after update of status on public.scan_contributions
for each row
when (new.status = 'published' and old.status is distinct from 'published')
execute function app_private.record_global_ranking();

create index scan_contributions_pending_review_idx
  on public.scan_contributions (created_at desc)
  where status = 'pending_review';
