-- EcoSim — full schema for a fresh Supabase project.
-- Existing projects: apply the migrations in supabase/migrations/ in filename order
-- instead of re-running this file.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  created_at timestamptz default now()
);

create table public.user_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  region_id text not null,
  current_level integer default 1 check (current_level >= 1),
  completed_levels integer[] default '{}',
  research_points integer default 0 check (research_points >= 0),
  unlocked_items text[] default '{}',
  updated_at timestamptz default now(),
  unique (user_id, region_id)
);

create table public.mission_results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  region_id text not null,
  level integer not null check (level >= 1),
  pollution_final integer,
  biodiversity_final integer,
  water_quality_final integer,
  fish_population_final integer,
  trees_planted integer,
  drones_deployed integer,
  research_points_earned integer,
  completed_at timestamptz default now(),
  constraint mission_results_user_region_level_key unique (user_id, region_id, level)
);

-- Server-side source of truth for mission objectives, rewards, and cooldowns.
-- Keep in sync with src/data/regions.ts.
create table public.mission_catalog (
  region_id text not null,
  level integer not null check (level >= 1),
  research_points integer not null check (research_points >= 0),
  min_completion_seconds integer not null default 30 check (min_completion_seconds >= 0),
  pollution_max integer check (pollution_max between 0 and 100),
  biodiversity_min integer check (biodiversity_min between 0 and 100),
  water_quality_min integer check (water_quality_min between 0 and 100),
  fish_population_min integer check (fish_population_min between 0 and 100),
  trees_min integer check (trees_min >= 0),
  drones_min integer check (drones_min >= 0),
  primary key (region_id, level)
);

create index mission_results_user_completed_idx
  on public.mission_results (user_id, completed_at desc);

create table public.achievements (
  id text primary key,
  title text not null,
  description text not null,
  icon text not null default '🏆',
  condition_type text not null
    check (condition_type in ('trees_planted', 'pollution_below', 'missions_completed', 'research_points')),
  condition_value integer not null check (condition_value >= 0),
  created_at timestamptz not null default now()
);

create table public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.mission_results enable row level security;
alter table public.mission_catalog enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can read own progress" on public.user_progress
  for select using (auth.uid() = user_id);

-- Progress writes go through the security-definer complete_mission RPC.

create policy "Users can read own results" on public.mission_results
  for select using (auth.uid() = user_id);

-- Mission results are written only by the security-definer complete_mission RPC.
-- mission_catalog has no client policies; it is read by that RPC.

create policy "Achievements are readable by everyone" on public.achievements
  for select using (true);

create policy "Users can read own achievements" on public.user_achievements
  for select using (auth.uid() = user_id);

create policy "Users can insert own achievements" on public.user_achievements
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Grants (Supabase roles)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

revoke all on public.mission_catalog from anon, authenticated;
revoke insert, update, delete on public.mission_results from anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select on public.user_progress to authenticated;
grant select on public.mission_results to authenticated;
grant select on public.achievements to anon, authenticated;
grant select, insert on public.user_achievements to authenticated;

-- ---------------------------------------------------------------------------
-- Achievement catalog
-- ---------------------------------------------------------------------------
insert into public.achievements (id, title, description, icon, condition_type, condition_value)
values
  ('first-mission',  'First Steps',     'Selesaikan misi pertamamu',              '🌱', 'missions_completed', 1),
  ('river-keeper',   'River Keeper',    'Selesaikan 2 misi pemulihan sungai',     '🌿', 'missions_completed', 2),
  ('tree-planter',   'Tree Planter',    'Tanam 50 pohon',                         '🌳', 'trees_planted', 50),
  ('forest-guardian','Forest Guardian', 'Tanam 100 pohon',                        '🌲', 'trees_planted', 100),
  ('clean-river',    'Clean River',     'Turunkan polusi hingga 20% atau kurang', '💧', 'pollution_below', 20),
  ('researcher',     'Researcher',      'Kumpulkan 250 research points',          '🔬', 'research_points', 250),
  ('lead-researcher','Lead Researcher', 'Kumpulkan 1000 research points',         '🏆', 'research_points', 1000);

-- ---------------------------------------------------------------------------
-- Mission catalog
-- ---------------------------------------------------------------------------
insert into public.mission_catalog (
  region_id, level, research_points, min_completion_seconds,
  pollution_max, biodiversity_min, water_quality_min,
  fish_population_min, trees_min, drones_min
) values
  ('west-java', 1, 250, 30, 20, null, null, 60, 50, null),
  ('west-java', 2, 400, 30, null, 60, null, null, 100, 5);

-- ---------------------------------------------------------------------------
-- Signup trigger
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Atomic mission completion
-- ---------------------------------------------------------------------------
create or replace function public.complete_mission(
  p_region_id text,
  p_level integer,
  p_pollution integer,
  p_biodiversity integer,
  p_water_quality integer,
  p_fish_population integer,
  p_trees integer,
  p_drones integer
)
returns public.user_progress
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_mission public.mission_catalog%rowtype;
  v_existing public.user_progress;
  v_progress public.user_progress;
  v_completed integer[];
  v_award integer;
  v_already_completed boolean;
  v_last_completed timestamptz;
  v_wait_seconds integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_level < 1 then
    raise exception 'Invalid mission level: %', p_level using errcode = '22023';
  end if;

  select *
  into v_mission
  from public.mission_catalog
  where region_id = p_region_id and level = p_level;

  if not found then
    raise exception 'Unknown mission: % level %', p_region_id, p_level using errcode = '22023';
  end if;

  if p_pollution is null or p_pollution < 0 or p_pollution > 100
     or p_biodiversity is null or p_biodiversity < 0 or p_biodiversity > 100
     or p_water_quality is null or p_water_quality < 0 or p_water_quality > 100
     or p_fish_population is null or p_fish_population < 0 or p_fish_population > 100
     or p_trees is null or p_trees < 0 or p_trees > 100000
     or p_drones is null or p_drones < 0 or p_drones > 100000 then
    raise exception 'Invalid mission stats' using errcode = '22023';
  end if;

  if v_mission.pollution_max is not null and p_pollution > v_mission.pollution_max then
    raise exception 'Mission objective not met: pollution % exceeds %', p_pollution, v_mission.pollution_max using errcode = 'P0001';
  end if;
  if v_mission.biodiversity_min is not null and p_biodiversity < v_mission.biodiversity_min then
    raise exception 'Mission objective not met: biodiversity % is below %', p_biodiversity, v_mission.biodiversity_min using errcode = 'P0001';
  end if;
  if v_mission.water_quality_min is not null and p_water_quality < v_mission.water_quality_min then
    raise exception 'Mission objective not met: water quality % is below %', p_water_quality, v_mission.water_quality_min using errcode = 'P0001';
  end if;
  if v_mission.fish_population_min is not null and p_fish_population < v_mission.fish_population_min then
    raise exception 'Mission objective not met: fish population % is below %', p_fish_population, v_mission.fish_population_min using errcode = 'P0001';
  end if;
  if v_mission.trees_min is not null and p_trees < v_mission.trees_min then
    raise exception 'Mission objective not met: trees % is below %', p_trees, v_mission.trees_min using errcode = 'P0001';
  end if;
  if v_mission.drones_min is not null and p_drones < v_mission.drones_min then
    raise exception 'Mission objective not met: drones % is below %', p_drones, v_mission.drones_min using errcode = 'P0001';
  end if;

  select *
  into v_existing
  from public.user_progress
  where user_id = v_uid and region_id = p_region_id
  for update;

  v_completed := coalesce(v_existing.completed_levels, '{}'::integer[]);

  if p_level > 1 and not ((p_level - 1) = any(v_completed)) then
    raise exception 'Level % must be completed first', p_level - 1 using errcode = 'P0001';
  end if;

  v_already_completed := p_level = any(v_completed);

  if v_already_completed then
    -- Replays are idempotent and never award points again.
    v_award := 0;
  else
    -- Limit the completion rate across all missions. This catches clients that
    -- submit fabricated progress for several levels in quick succession.
    select max(completed_at)
    into v_last_completed
    from public.mission_results
    where user_id = v_uid;

    if v_last_completed is not null
       and v_last_completed > now() - make_interval(secs => v_mission.min_completion_seconds) then
      v_wait_seconds := greatest(
        1,
        ceil(extract(epoch from (
          v_last_completed
          + make_interval(secs => v_mission.min_completion_seconds)
          - now()
        )))::integer
      );
      raise exception 'Mission completion rate limit exceeded; wait % seconds', v_wait_seconds using errcode = 'P0001';
    end if;

    v_award := v_mission.research_points;
    v_completed := array_append(v_completed, p_level);
  end if;

  select coalesce(array_agg(distinct lvl order by lvl), '{}'::integer[])
  into v_completed
  from unnest(v_completed) as t(lvl)
  where lvl is not null;

  insert into public.mission_results (
    user_id, region_id, level, pollution_final, biodiversity_final,
    water_quality_final, fish_population_final, trees_planted,
    drones_deployed, research_points_earned
  ) values (
    v_uid, p_region_id, p_level, p_pollution, p_biodiversity,
    p_water_quality, p_fish_population, p_trees,
    p_drones, v_award
  )
  on conflict (user_id, region_id, level) do update set
    pollution_final = excluded.pollution_final,
    biodiversity_final = excluded.biodiversity_final,
    water_quality_final = excluded.water_quality_final,
    fish_population_final = excluded.fish_population_final,
    trees_planted = excluded.trees_planted,
    drones_deployed = excluded.drones_deployed,
    research_points_earned = greatest(
      coalesce(mission_results.research_points_earned, 0),
      excluded.research_points_earned
    );

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

revoke all on function public.complete_mission(
  text, integer, integer, integer, integer, integer, integer, integer
) from public;
grant execute on function public.complete_mission(
  text, integer, integer, integer, integer, integer, integer, integer
) to authenticated;

-- ---------------------------------------------------------------------------
-- Public single-player leaderboard
-- Security definer so guests can read rankings without exposing progress rows.
-- Only aggregate stats and the public username are returned.
-- ---------------------------------------------------------------------------
create or replace function public.get_leaderboard(p_limit integer default 50)
returns table (
  rank bigint,
  username text,
  total_points bigint,
  missions_completed bigint,
  achievements_count bigint,
  regions_count bigint,
  is_current_user boolean
)
language sql
security definer
set search_path = public
stable
as $$
  with stats as (
    select
      p.id,
      p.username,
      coalesce(sum(up.research_points), 0)::bigint as total_points,
      coalesce(sum(coalesce(cardinality(up.completed_levels), 0)), 0)::bigint as missions_completed,
      coalesce(count(*) filter (where coalesce(cardinality(up.completed_levels), 0) > 0), 0)::bigint as regions_count,
      (
        select count(*)::bigint
        from public.user_achievements ua
        where ua.user_id = p.id
      ) as achievements_count
    from public.profiles p
    left join public.user_progress up on up.user_id = p.id
    group by p.id, p.username
  ),
  ranked as (
    select
      s.*,
      row_number() over (
        order by
          s.total_points desc,
          s.missions_completed desc,
          s.achievements_count desc,
          s.regions_count desc,
          lower(s.username) asc,
          s.id asc
      ) as position
    from stats s
  )
  select
    r.position as rank,
    r.username,
    r.total_points,
    r.missions_completed,
    r.achievements_count,
    r.regions_count,
    coalesce(r.id = auth.uid(), false) as is_current_user
  from ranked r
  where r.position <= greatest(1, least(coalesce(p_limit, 50), 100))
     or (auth.uid() is not null and r.id = auth.uid())
  order by r.position
$$;

revoke all on function public.get_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to anon, authenticated;
