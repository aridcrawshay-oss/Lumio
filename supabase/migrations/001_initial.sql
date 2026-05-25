-- ─────────────────────────────────────────────
-- Lumio Database Schema
-- Run this in Supabase SQL editor
-- ─────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Profiles ──────────────────────────────────
-- Extends Supabase auth.users
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null default '',
  email        text not null default '',
  avatar_url   text,
  tokens       integer not null default 10,
  xp           integer not null default 10,
  streak       integer not null default 0,
  last_active  date not null default current_date,
  fc_mastered  integer not null default 0,
  pomo_sessions integer not null default 0,
  essays_graded integer not null default 0,
  plans_generated integer not null default 0,
  tokens_spent integer not null default 0,
  level        integer not null default 1,
  theme        text not null default 'dark',
  accent_idx   integer not null default 0,
  lb_code      text not null default upper(substring(md5(random()::text) from 1 for 6)),
  trial_started_at timestamptz not null default now(),
  trial_ends_at    timestamptz not null default (now() + interval '14 days'),
  is_subscribed    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── Subjects ──────────────────────────────────
create table public.subjects (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  name         text not null,
  icon         text not null default '📖',
  color        text not null default '#6c5ce7',
  notes        text not null default '',
  progress     integer not null default 0,
  target_grade integer not null default 80,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── Files (metadata only — content in storage) ─
create table public.files (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  subject_id   uuid not null references public.subjects(id) on delete cascade,
  name         text not null,
  size_bytes   bigint not null default 0,
  mime_type    text not null default '',
  storage_path text not null default '',
  text_content text,
  created_at   timestamptz not null default now()
);

-- ── Assignments ───────────────────────────────
create table public.assignments (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  subject_id   uuid references public.subjects(id) on delete set null,
  title        text not null,
  notes        text not null default '',
  due_date     date,
  priority     text not null default 'med' check (priority in ('high','med','low')),
  done         boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── Flashcards ────────────────────────────────
create table public.flashcards (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  subject_id   uuid references public.subjects(id) on delete set null,
  subject_name text not null default '',
  front        text not null,
  back         text not null,
  ease         numeric not null default 2.5,
  interval_days integer not null default 1,
  missed       integer not null default 0,
  due_date     date not null default current_date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── Goals ─────────────────────────────────────
create table public.goals (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  subject_id   uuid references public.subjects(id) on delete set null,
  title        text not null,
  subject_name text not null default 'General',
  target_grade integer not null default 90,
  current_grade integer not null default 0,
  created_at   timestamptz not null default now()
);

-- ── Custom quests ─────────────────────────────
create table public.quests (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  subject_id   uuid references public.subjects(id) on delete set null,
  title        text not null,
  reward       integer not null default 10,
  done         boolean not null default false,
  quest_date   date not null default current_date,
  created_at   timestamptz not null default now()
);

-- ── Mood history ──────────────────────────────
create table public.mood_history (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  emoji        text not null,
  label        text not null,
  recorded_at  date not null default current_date,
  created_at   timestamptz not null default now()
);

-- ── AI chat history ───────────────────────────
create table public.ai_messages (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role         text not null check (role in ('user','assistant')),
  content      text not null,
  created_at   timestamptz not null default now()
);

-- ── Inventory (shop items) ────────────────────
create table public.inventory (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  item_id      text not null,
  active       boolean not null default true,
  purchased_at timestamptz not null default now()
);

-- ── Study history ─────────────────────────────
create table public.study_history (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  study_date   date not null default current_date,
  activity_count integer not null default 1,
  unique(user_id, study_date)
);

-- ── Daily quest tracking ──────────────────────
create table public.daily_quests (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  quest_id     text not null,
  quest_date   date not null default current_date,
  progress     integer not null default 0,
  done         boolean not null default false,
  unique(user_id, quest_id, quest_date)
);

-- ── Leaderboard friends ───────────────────────
create table public.lb_friends (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  friend_code  text not null,
  friend_name  text not null,
  joined_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.subjects       enable row level security;
alter table public.files          enable row level security;
alter table public.assignments    enable row level security;
alter table public.flashcards     enable row level security;
alter table public.goals          enable row level security;
alter table public.quests         enable row level security;
alter table public.mood_history   enable row level security;
alter table public.ai_messages    enable row level security;
alter table public.inventory      enable row level security;
alter table public.study_history  enable row level security;
alter table public.daily_quests   enable row level security;
alter table public.lb_friends     enable row level security;

-- Policies: users can only see/edit their own data
create policy "own profile"      on public.profiles      for all using (auth.uid() = id);
create policy "own subjects"     on public.subjects       for all using (auth.uid() = user_id);
create policy "own files"        on public.files          for all using (auth.uid() = user_id);
create policy "own assignments"  on public.assignments    for all using (auth.uid() = user_id);
create policy "own flashcards"   on public.flashcards     for all using (auth.uid() = user_id);
create policy "own goals"        on public.goals          for all using (auth.uid() = user_id);
create policy "own quests"       on public.quests         for all using (auth.uid() = user_id);
create policy "own mood"         on public.mood_history   for all using (auth.uid() = user_id);
create policy "own ai_messages"  on public.ai_messages    for all using (auth.uid() = user_id);
create policy "own inventory"    on public.inventory      for all using (auth.uid() = user_id);
create policy "own study_hist"   on public.study_history  for all using (auth.uid() = user_id);
create policy "own daily_quests" on public.daily_quests   for all using (auth.uid() = user_id);
create policy "own lb_friends"   on public.lb_friends     for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Auto-create profile on signup
-- ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce(new.email, '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- Storage bucket for file uploads
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('lumio-files', 'lumio-files', false)
on conflict do nothing;

create policy "users can upload own files"
  on storage.objects for insert
  with check (bucket_id = 'lumio-files' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users can read own files"
  on storage.objects for select
  using (bucket_id = 'lumio-files' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users can delete own files"
  on storage.objects for delete
  using (bucket_id = 'lumio-files' and auth.uid()::text = (storage.foldername(name))[1]);
