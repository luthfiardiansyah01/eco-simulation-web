-- User profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  created_at timestamptz default now()
);

-- Player progress per region
create table public.user_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  region_id text not null,
  current_level integer default 1,
  completed_levels integer[] default '{}',
  research_points integer default 0,
  unlocked_items text[] default '{}',
  updated_at timestamptz default now(),
  unique(user_id, region_id)
);

-- Mission results log
create table public.mission_results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  region_id text not null,
  level integer not null,
  pollution_final integer,
  biodiversity_final integer,
  trees_planted integer,
  research_points_earned integer,
  completed_at timestamptz default now()
);

-- RLS policies
alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.mission_results enable row level security;

create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can read own progress" on public.user_progress
  for select using (auth.uid() = user_id);

create policy "Users can upsert own progress" on public.user_progress
  for all using (auth.uid() = user_id);

create policy "Users can read own results" on public.mission_results
  for select using (auth.uid() = user_id);

create policy "Users can insert own results" on public.mission_results
  for insert with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
