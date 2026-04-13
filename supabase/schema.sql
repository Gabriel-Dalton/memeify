-- Memeify MVP schema
create extension if not exists "uuid-ossp";

create table if not exists public.rooms (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  name text not null,
  status text not null default 'waiting' check (status in ('waiting', 'editing', 'voting', 'results')),
  round_number integer not null default 1,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.room_members (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null,
  nickname text not null,
  score integer not null default 0,
  joined_at timestamptz not null default timezone('utc', now()),
  submitted_at timestamptz,
  unique (room_id, user_id)
);

create table if not exists public.memes (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null,
  nickname text not null,
  image_url text not null,
  round_number integer not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.votes (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  meme_id uuid not null references public.memes(id) on delete cascade,
  voter_user_id uuid not null,
  round_number integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (room_id, round_number, voter_user_id)
);

create index if not exists idx_memes_room_round on public.memes(room_id, round_number);
create index if not exists idx_votes_room_round on public.votes(room_id, round_number);

create or replace view public.leaderboard as
select
  m.user_id,
  max(m.nickname) as nickname,
  count(distinct m.id)::int as total_memes,
  count(v.id)::int as total_votes
from public.memes m
left join public.votes v on v.meme_id = m.id
group by m.user_id;

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.memes enable row level security;
alter table public.votes enable row level security;

grant select on public.leaderboard to anon, authenticated;

-- Policies (Postgres does NOT support `CREATE POLICY IF NOT EXISTS`,
-- so we drop-then-create to stay idempotent.)

drop policy if exists "Rooms are readable by anyone" on public.rooms;
create policy "Rooms are readable by anyone"
  on public.rooms for select using (true);

drop policy if exists "Authenticated users create rooms" on public.rooms;
create policy "Authenticated users create rooms"
  on public.rooms for insert to authenticated with check (true);

drop policy if exists "Authenticated users update room status" on public.rooms;
create policy "Authenticated users update room status"
  on public.rooms for update to authenticated using (true) with check (true);

drop policy if exists "Members readable" on public.room_members;
create policy "Members readable"
  on public.room_members for select using (true);

drop policy if exists "Members upsert" on public.room_members;
create policy "Members upsert"
  on public.room_members for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Members update self" on public.room_members;
create policy "Members update self"
  on public.room_members for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Memes readable" on public.memes;
create policy "Memes readable"
  on public.memes for select using (true);

drop policy if exists "Users insert own meme" on public.memes;
create policy "Users insert own meme"
  on public.memes for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Votes readable" on public.votes;
create policy "Votes readable"
  on public.votes for select using (true);

drop policy if exists "Votes insert by voter" on public.votes;
create policy "Votes insert by voter"
  on public.votes for insert to authenticated with check (auth.uid() = voter_user_id);

-- Storage bucket for meme uploads
insert into storage.buckets (id, name, public)
values ('memes', 'memes', true)
on conflict (id) do nothing;

drop policy if exists "Public meme storage read" on storage.objects;
create policy "Public meme storage read"
  on storage.objects for select using (bucket_id = 'memes');

drop policy if exists "Authenticated users upload memes" on storage.objects;
create policy "Authenticated users upload memes"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'memes');
