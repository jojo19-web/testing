-- Keep rankings aligned with the current contribution moderation state.
-- The ledger is intentionally append-only for auditability, so the view must
-- exclude contributions that were later quarantined or removed.

create or replace view public.global_disease_rankings
  with (security_invoker = true)
as
select
  ledger.disease_id,
  count(*)::bigint as scan_count,
  max(ledger.published_at) as latest_scan_at
from public.global_ranking_ledger as ledger
join public.scan_contributions as contribution
  on contribution.id = ledger.contribution_id
where contribution.status in ('published', 'expired')
group by ledger.disease_id;
