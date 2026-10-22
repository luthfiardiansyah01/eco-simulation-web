-- EcoSim: leaderboard integrity
-- Progress rows must be written by complete_mission(). Allowing clients to
-- upsert user_progress directly would let them rewrite research_points and
-- manipulate the public leaderboard.

drop policy if exists "Users can upsert own progress" on public.user_progress;
revoke insert, update, delete on public.user_progress from anon, authenticated;
