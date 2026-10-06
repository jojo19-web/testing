# Eggplant Disease Detector Admin

Private Next.js administration and mobile API service for the Eggplant Disease Detector. The dashboard reads live Supabase data, protects every administrative page and mutation with both Supabase authentication and `admin_members` authorization, and never substitutes placeholder production metrics.

## Runtime configuration

Configure these values in Vercel encrypted environment variables. Do not commit them:

- `NEXT_PUBLIC_SUPABASE_URL` — public Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — public publishable key used by browser authentication.
- `SUPABASE_SECRET_KEY` — server-only secret key used by protected route handlers and the admin data layer.

The mobile app can bootstrap its public Supabase configuration from `/api/mobile/v1/config`. That endpoint returns only the public project URL and publishable key; it never returns `SUPABASE_SECRET_KEY`.
- `CRON_SECRET` — secret bearer token used by the daily retention/deletion job.
- `ADMIN_LOGIN_NAME` — optional legacy bootstrap alias for the existing owner account.
- `ADMIN_LOGIN_EMAIL` — optional legacy bootstrap email for the existing Supabase Auth owner account.
- `ADMIN_AUTH_EMAIL_DOMAIN` — optional private domain for username-only accounts; defaults to `admin.invalid` and is never used for email delivery.

The service starts safely with cloud writes disabled in `app_config`. Read APIs and the offline-first Android client continue to work while writes are paused.

## Local verification

Use Node.js 22 or later:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Run locally with configured environment variables:

```bash
npm run dev
```

The health endpoint is `GET /api/health`. Mobile endpoints require a valid Supabase anonymous-user bearer token. Administrative routes require a password session whose user ID exists in `admin_members`. Username sign-in resolves a server-only Auth identity; passwords are verified and stored by Supabase Auth, never by this dashboard.

## Admin access setup

The owner can open **Admin access** in the dashboard and create additional users with only a username, password, and role. The server creates a private, auto-confirmed Supabase Auth identity behind the scenes, stores only the Auth UUID and normalized username in `public.admin_members`, and never stores a password. The supported roles created by the UI are `admin` and `reviewer`; the existing `owner` remains the highest-privilege role.

The existing `ADMIN_LOGIN_NAME` and `ADMIN_LOGIN_EMAIL` values remain as a temporary bootstrap path so the current owner can sign in before claiming a username in the dashboard. Once the owner claims a username, future sign-ins resolve through `public.admin_members`.

Do not disable hosted email confirmation globally just to create username-only accounts: the server creates these internal identities with `email_confirm: true` because they are not contact addresses. Supabase’s Auth Admin API must remain server-only and the service key must never reach the browser.

Do not commit a password or place one in `NEXT_PUBLIC_*` configuration. Use a unique password of at least 12 characters; do not use examples such as `admin123` in production.

## Deployment

The Vercel project root directory is `admin/`. `vercel.json` schedules the daily maintenance route, which:

- immediately keeps expired photos out of the public feed and retries object cleanup;
- processes scoped user cloud-deletion requests;
- records failed work instead of returning a false success.

Promote a deployment only after authentication, authorization, Storage, feed, reporting, deletion, lint, type-check, test, build, and runtime-header smoke tests pass.
