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

create policy if not exists "Rooms are readable by anyone"
on public.rooms for select using (true);
create policy if not exists "Authenticated users create rooms"
on public.rooms for insert to authenticated with check (true);
create policy if not exists "Authenticated users update room status"
on public.rooms for update to authenticated using (true) with check (true);

create policy if not exists "Members readable"
on public.room_members for select using (true);
create policy if not exists "Members upsert"
on public.room_members for insert to authenticated with check (auth.uid() = user_id);
create policy if not exists "Members update self"
on public.room_members for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists "Memes readable"
on public.memes for select using (true);
create policy if not exists "Users insert own meme"
on public.memes for insert to authenticated with check (auth.uid() = user_id);

create policy if not exists "Votes readable"
on public.votes for select using (true);
create policy if not exists "Votes insert by voter"
on public.votes for insert to authenticated with check (auth.uid() = voter_user_id);

insert into storage.buckets (id, name, public)
values ('memes', 'memes', true)
on conflict (id) do nothing;

create policy if not exists "Public meme storage read"
on storage.objects for select using (bucket_id = 'memes');

create policy if not exists "Authenticated users upload memes"
on storage.objects for insert to authenticated
with check (bucket_id = 'memes');
