-- ============================================================
--  FutBattles — Supabase schema
--  Paste this into: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- 1. Profiles (one row per auth user)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,
  coins       integer not null default 1000,
  created_at  timestamptz not null default now()
);

-- 2. Each player's card roster
create table if not exists public.user_cards (
  id              uuid primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  name            text not null,
  position        text,
  stats           jsonb not null default '{}',
  cosmetic        text not null default 'base',
  club_affinity   text,
  nation_affinity text,
  image_url       text,
  created_at      timestamptz not null default now()
);

-- 3. Battle history
create table if not exists public.battle_history (
  id            uuid primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  result        text not null check (result in ('win','loss','draw')),
  player_goals  integer not null,
  ai_goals      integer not null,
  formation     text not null,
  coins_earned  integer not null default 0,
  created_at    timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists user_cards_user_id_idx     on public.user_cards(user_id);
create index if not exists battle_history_user_id_idx on public.battle_history(user_id);

-- ── Row Level Security ────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.user_cards    enable row level security;
alter table public.battle_history enable row level security;

-- profiles: users can read/write only their own row
create policy "profiles: own row"
  on public.profiles for all
  using (auth.uid() = id);

-- user_cards: users can CRUD only their own cards
create policy "user_cards: own cards"
  on public.user_cards for all
  using (auth.uid() = user_id);

-- battle_history: users can read/insert their own records
create policy "battle_history: own records"
  on public.battle_history for all
  using (auth.uid() = user_id);

-- leaderboard: everyone can read all profiles (for the leaderboard)
create policy "profiles: public read"
  on public.profiles for select
  using (true);

-- ── Auto-create profile on sign-up ───────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
