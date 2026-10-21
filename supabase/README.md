# Supabase setup

## Fresh project

Run `schema.sql` once in the Supabase SQL editor (or `supabase db reset` if you use the CLI).
It creates the tables, RLS policies, achievement seed data, the signup trigger, and the
`complete_mission` RPC.

## Existing project

Apply the migrations in `migrations/` in filename order:

```bash
supabase db push
```

Or paste `migrations/20261021000000_progress_achievements.sql` into the SQL editor.

The migration is idempotent and adds:

- `achievements` and `user_achievements` tables + policies + seed rows,
- a unique `(user_id, region_id, level)` result key,
- a collision-safe `handle_new_user` trigger,
- `complete_mission(...)`, which merges completed levels, accumulates research points,
  prevents replay farming, and enforces sequential level progression transactionally.

## Required environment variables

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

The app calls `complete_mission` after a mission; if the RPC is missing the completion
screen reports a save error instead of pretending progress was stored.

## Auth redirect configuration

In Supabase Dashboard → Authentication → URL Configuration:

- Set **Site URL** to your production origin (for example `https://your-app.vercel.app`).
- Add these **Redirect URLs** for production and local development:
  - `https://your-app.vercel.app/auth/callback`
  - `https://your-app.vercel.app/auth/confirm`
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/confirm`

The app refreshes sessions in `src/proxy.ts`, exchanges OAuth/PKCE codes in
`/auth/callback`, and verifies email confirmation links in `/auth/confirm`.

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

If you also use password recovery later, add a similar `/auth/confirm` link with
`type=recovery` and the appropriate `next` path.
