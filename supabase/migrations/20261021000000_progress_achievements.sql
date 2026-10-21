-- EcoSim: achievements catalog + atomic mission completion
-- Apply to an existing project after the base schema:
--   supabase db push
-- or paste this file into the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- 1. Achievement catalog and per-user unlocks
-- ---------------------------------------------------------------------------
create table if not exists public.achievements (
  id text primary key,
  title text not null,
  description text not null,
  icon text not null default '🏆',
  condition_type text not null
    check (condition_type in ('trees_planted', 'pollution_below', 'missions_completed', 'research_points')),
  condition_value integer not null check (condition_value >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

drop policy if exists "Achievements are readable by everyone" on public.achievements;
create policy "Achievements are readable by everyone" on public.achievements
  for select using (true);

drop policy if exists "Users can read own achievements" on public.user_achievements;
create policy "Users can read own achievements" on public.user_achievements
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own achievements" on public.user_achievements;
create policy "Users can insert own achievements" on public.user_achievements
  for insert with check (auth.uid() = user_id);

grant select on public.achievements to anon, authenticated;
grant select, insert on public.user_achievements to authenticated;

insert into public.achievements (id, title, description, icon, condition_type, condition_value)
values
  ('first-mission',  'First Steps',       'Selesaikan misi pertamamu',                    '🌱', 'missions_completed', 1),
  ('river-keeper',   'River Keeper',      'Selesaikan 2 misi pemulihan sungai',           '🌿', 'missions_completed', 2),
  ('tree-planter',   'Tree Planter',      'Tanam 50 pohon',                               '🌳', 'trees_planted', 50),
  ('forest-guardian','Forest Guardian',   'Tanam 100 pohon',                              '🌲', 'trees_planted', 100),
  ('clean-river',    'Clean River',       'Turunkan polusi hingga 20% atau kurang',       '💧', 'pollution_below', 20),
  ('researcher',     'Researcher',        'Kumpulkan 250 research points',                '🔬', 'research_points', 250),
  ('lead-researcher','Lead Researcher',   'Kumpulkan 1000 research points',               '🏆', 'research_points', 1000)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  condition_type = excluded.condition_type,
  condition_value = excluded.condition_value;

-- One result row per user/region/level so replays update instead of duplicating.
delete from public.mission_results a
using public.mission_results b
where a.ctid < b.ctid
  and a.user_id = b.user_id
  and a.region_id = b.region_id
  and a.level = b.level;

create unique index if not exists mission_results_user_region_level_key
  on public.mission_results (user_id, region_id, level);

-- Harden profile policies with an explicit WITH CHECK.
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users can upsert own progress" on public.user_progress;
create policy "Users can upsert own progress" on public.user_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. Signup trigger: avoid username collisions and pin the search path
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_username text;
begin
  v_base := coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'player');
  v_username := v_base;

  if exists (select 1 from public.profiles where username = v_username) then
    v_username := v_base || '-' || substr(new.id::text, 1, 8);
  end if;

  insert into public.profiles (id, username) values (new.id, v_username);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Atomic mission completion
--    Merges completed levels, accumulates research points, prevents replay
--    farming, and records the mission result in one transaction.
-- ---------------------------------------------------------------------------
create or replace function public.complete_mission(
  p_region_id text,
  p_level integer,
  p_pollution integer,
  p_biodiversity integer,
  p_trees integer,
  p_research_points integer
)
returns public.user_progress
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_existing public.user_progress;
  v_progress public.user_progress;
  v_completed integer[];
  v_award integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_level < 1 then
    raise exception 'Invalid mission level: %', p_level using errcode = '22023';
  end if;

  select *
  into v_existing
  from public.user_progress
  where user_id = v_uid and region_id = p_region_id
  for update;

  v_completed := coalesce(v_existing.completed_levels, '{}'::integer[]);

  -- Enforce sequential progression even if a player opens a play URL directly.
  if p_level > 1 and not ((p_level - 1) = any(v_completed)) then
    raise exception 'Level % must be completed first', p_level - 1 using errcode = 'P0001';
  end if;

  -- Award points only the first time this level is completed.
  if p_level = any(v_completed) then
    v_award := 0;
  else
    v_award := least(greatest(coalesce(p_research_points, 0), 0), 1000);
    v_completed := array_append(v_completed, p_level);
  end if;

  select coalesce(array_agg(distinct lvl order by lvl), '{}'::integer[])
  into v_completed
  from unnest(v_completed) as t(lvl)
  where lvl is not null;

  insert into public.mission_results (
    user_id, region_id, level, pollution_final, biodiversity_final,
    trees_planted, research_points_earned
  ) values (
    v_uid, p_region_id, p_level, p_pollution, p_biodiversity,
    p_trees, v_award
  )
  on conflict (user_id, region_id, level) do update set
    pollution_final = excluded.pollution_final,
    biodiversity_final = excluded.biodiversity_final,
    trees_planted = excluded.trees_planted,
    research_points_earned = excluded.research_points_earned;

  insert into public.user_progress (
    user_id, region_id, current_level, completed_levels,
    research_points, unlocked_items, updated_at
  ) values (
    v_uid, p_region_id, greatest(p_level + 1, 1), v_completed,
    v_award, '{}', now()
  )
  on conflict (user_id, region_id) do update set
    current_level = greatest(user_progress.current_level, excluded.current_level),
    completed_levels = v_completed,
    research_points = coalesce(user_progress.research_points, 0) + v_award,
    updated_at = now()
  returning * into v_progress;

  return v_progress;
end;
$$;

revoke all on function public.complete_mission(text, integer, integer, integer, integer, integer) from public;
grant execute on function public.complete_mission(text, integer, integer, integer, integer, integer) to authenticated;
