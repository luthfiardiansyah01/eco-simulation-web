-- EcoSim: server-side mission validation and completion rate limiting
-- Apply after 20261022000001_leaderboard_integrity.sql.
--
-- The client is not trusted for mission objectives or rewards. This migration
-- adds a mission catalog, validates the submitted final metrics, derives the
-- research reward on the server, and enforces a cooldown between first-time
-- completions. It also stops clients from inserting mission_results directly.

-- ---------------------------------------------------------------------------
-- 1. Mission catalog
--    Keep these rows in sync with src/data/regions.ts.
-- ---------------------------------------------------------------------------
create table if not exists public.mission_catalog (
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

alter table public.mission_catalog enable row level security;
revoke all on public.mission_catalog from anon, authenticated;

insert into public.mission_catalog (
  region_id, level, research_points, min_completion_seconds,
  pollution_max, biodiversity_min, water_quality_min,
  fish_population_min, trees_min, drones_min
) values
  ('west-java', 1, 250, 30, 20, null, null, 60, 50, null),
  ('west-java', 2, 400, 30, null, 60, null, null, 100, 5)
on conflict (region_id, level) do update set
  research_points = excluded.research_points,
  min_completion_seconds = excluded.min_completion_seconds,
  pollution_max = excluded.pollution_max,
  biodiversity_min = excluded.biodiversity_min,
  water_quality_min = excluded.water_quality_min,
  fish_population_min = excluded.fish_population_min,
  trees_min = excluded.trees_min,
  drones_min = excluded.drones_min;

-- ---------------------------------------------------------------------------
-- 2. Keep the final metrics used by the validation/audit trail
-- ---------------------------------------------------------------------------
alter table public.mission_results
  add column if not exists water_quality_final integer,
  add column if not exists fish_population_final integer,
  add column if not exists drones_deployed integer;

create index if not exists mission_results_user_completed_idx
  on public.mission_results (user_id, completed_at desc);

-- Completion is written only by the security-definer RPC below. Direct
-- inserts would let clients fabricate results and distort the cooldown.
drop policy if exists "Users can insert own results" on public.mission_results;
revoke insert, update, delete on public.mission_results from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Validated, rate-limited completion
-- ---------------------------------------------------------------------------
drop function if exists public.complete_mission(
  text, integer, integer, integer, integer, integer
);

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
