-- Username-only admin accounts use a private Auth identity behind the UI.
-- The application never stores or displays the password or internal Auth email.

alter table public.admin_members
  add column if not exists login_name text;

alter table public.admin_members
  add constraint admin_members_login_name_check
  check (login_name is null or login_name ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$');

create unique index if not exists admin_members_login_name_lower_idx
  on public.admin_members (lower(login_name))
  where login_name is not null;

create table if not exists public.admin_provisioning (
  id uuid primary key default gen_random_uuid(),
  login_name text not null,
  auth_user_id uuid references auth.users(id) on delete set null,
  role text not null check (role in ('admin', 'reviewer')),
  requested_by uuid not null references auth.users(id) on delete restrict,
  status text not null check (status in ('pending', 'active', 'failed')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_provisioning
  add constraint admin_provisioning_login_name_check
  check (login_name ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$');

create unique index if not exists admin_provisioning_login_name_lower_idx
  on public.admin_provisioning (lower(login_name));

create index if not exists admin_provisioning_status_idx
  on public.admin_provisioning (status, updated_at desc);

alter table public.admin_provisioning enable row level security;
revoke all privileges on public.admin_provisioning from public, anon, authenticated;
grant select, insert, update on public.admin_provisioning to service_role;
