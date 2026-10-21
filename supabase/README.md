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
