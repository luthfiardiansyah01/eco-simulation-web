-- EcoSim: single-player leaderboard
-- Apply after 20261021000000_progress_achievements.sql.
-- The function is idempotent and exposes only public aggregate stats.

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
