# Supabase setup

## Fresh project

Run `schema.sql` once in the Supabase SQL editor (or `supabase db reset` if you use the CLI).
It creates the tables, RLS policies, achievement seed data, the signup trigger, the
`complete_mission` RPC, and the public `get_leaderboard` RPC.

## Existing project

Apply the migrations in `migrations/` in filename order:

```bash
supabase db push
```

Or paste the migration files into the SQL editor in filename order.

The migrations are idempotent and add:

- `achievements` and `user_achievements` tables + policies + seed rows,
- a unique `(user_id, region_id, level)` result key,
- a collision-safe `handle_new_user` trigger,
- `complete_mission(...)`, which merges completed levels, accumulates research points,
  prevents replay farming, and enforces sequential level progression transactionally,
- `get_leaderboard(...)`, a `security definer` RPC that exposes only usernames and
  aggregate single-player stats so guests can view rankings without direct table access,
- a leaderboard-integrity guard that revokes direct `user_progress` writes, so progress
  can only be changed through `complete_mission`.

## Required environment variables

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

The app calls `complete_mission` after a mission; if the RPC is missing the completion
screen reports a save error instead of pretending progress was stored. The leaderboard
page calls `get_leaderboard`; if that RPC is missing it shows a setup message instead of
an empty ranking.

## Auth redirect configuration

In Supabase Dashboard → Authentication → URL Configuration:

- Set **Site URL** to your production origin (for example `https://your-app.vercel.app`).
- Add these **Redirect URLs** for production and local development:
  - `https://your-app.vercel.app/auth/callback`
  - `https://your-app.vercel.app/auth/confirm`
  - `https://your-app.vercel.app/auth/recovery`
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/confirm`
  - `http://localhost:3000/auth/recovery`

The app refreshes sessions in `src/proxy.ts`, exchanges OAuth/PKCE codes in
`/auth/callback`, and verifies email confirmation links in `/auth/confirm`.
Recovery links use `/auth/recovery`, which accepts `token_hash`, a PKCE `code`, or
implicit-flow fragment tokens and then redirects to `/reset-password`.

### Required email template change for SSR

The default Supabase confirmation link returns the session in a URL fragment, which
server-side code cannot read. For SSR, update **Confirm signup** in the Supabase email
templates to send the token hash to `/auth/confirm`:

```html
<h2>Confirm your email address</h2>
<p>Follow the link below to confirm this email address and finish signing up.</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/">
    Confirm email address
  </a>
</p>
```

Keep `next=/` (or another relative path). Do not point `next` at `/auth/callback`; that
route expects an OAuth/PKCE `code` and cannot verify a `token_hash`. The confirmation
route verifies the hash, writes the session cookies, and redirects into the app.

### Password recovery email template

The app supports both recovery methods:

- **6-digit code** entered on `/forgot-password`
- **Recovery link** to `/auth/recovery`

Update **Reset Password** in the Supabase email templates to include both the token
and a server-verifiable link:

```html
<h2>Reset your password</h2>
<p>Enter this 6-digit code in EcoSim:</p>
<p style="font-size: 24px; letter-spacing: 6px;"><strong>{{ .Token }}</strong></p>
<p>Or follow this link to choose a new password:</p>
<p>
  <a href="{{ .SiteURL }}/auth/recovery?token_hash={{ .TokenHash }}&type=recovery">
    Reset password
  </a>
</p>
```

The code path requires `{{ .Token }}` in the template and an email OTP length of 6
(Authentication → Providers → Email → Email OTP Length), matching the app's 6-digit
input. The link path uses `/auth/recovery`, which verifies the token hash, creates the
recovery session, and redirects to `/reset-password`. The same route also accepts
Supabase's default PKCE `code` links and implicit-flow fragment tokens.
