-- Keep provisioning foreign-key lookups efficient as the admin directory grows.

create index if not exists admin_provisioning_auth_user_id_idx
  on public.admin_provisioning (auth_user_id)
  where auth_user_id is not null;

create index if not exists admin_provisioning_requested_by_idx
  on public.admin_provisioning (requested_by);
