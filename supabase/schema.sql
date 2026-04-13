-- Memeify MVP schema
-- Casual party game — no auth required, anon role can do everything.
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
  kicked_at timestamptz,
  unique (room_id, user_id)
);

-- Additive migration for existing deployments that already had room_members.
alter table public.room_members
  add column if not exists kicked_at timestamptz;

create table if not exists public.memes (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null,
  nickname text not null,
  image_url text not null,
  round_number integer not null,
  created_at timestamptz not null default timezone('utc', now())
);

-- One meme per user per round. If an existing deployment has duplicates
-- (from earlier resubmits), keep the most recent and delete the rest
-- before adding the unique constraint.
do $$
begin
  delete from public.memes m1
  using public.memes m2
  where m1.id <> m2.id
    and m1.room_id = m2.room_id
    and m1.user_id = m2.user_id
    and m1.round_number = m2.round_number
    and m1.created_at < m2.created_at;

  begin
    alter table public.memes
      add constraint memes_room_user_round_unique
      unique (room_id, user_id, round_number);
  exception
    when duplicate_object then null;
    when duplicate_table then null;
  end;
end $$;

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
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.rooms        to anon, authenticated;
grant select, insert, update on public.room_members to anon, authenticated;
grant select, insert, update on public.memes        to anon, authenticated;
grant select, insert on public.votes                to anon, authenticated;

-- Open RLS — no real auth. This is a casual party meme game.
-- If someone hacks it to insert a meme with a weird user_id, the worst thing
-- that happens is a leaderboard entry gets a fake name. Acceptable.

drop policy if exists "Rooms open read"   on public.rooms;
drop policy if exists "Rooms open write"  on public.rooms;
create policy "Rooms open read"  on public.rooms for select using (true);
create policy "Rooms open write" on public.rooms for insert with check (true);
drop policy if exists "Rooms open update" on public.rooms;
create policy "Rooms open update" on public.rooms for update using (true) with check (true);

drop policy if exists "Members open read"   on public.room_members;
drop policy if exists "Members open write"  on public.room_members;
drop policy if exists "Members open update" on public.room_members;
create policy "Members open read"   on public.room_members for select using (true);
create policy "Members open write"  on public.room_members for insert with check (true);
create policy "Members open update" on public.room_members for update using (true) with check (true);

drop policy if exists "Memes open read"  on public.memes;
drop policy if exists "Memes open write" on public.memes;
create policy "Memes open read"  on public.memes for select using (true);
create policy "Memes open write" on public.memes for insert with check (true);

drop policy if exists "Votes open read"  on public.votes;
drop policy if exists "Votes open write" on public.votes;
create policy "Votes open read"  on public.votes for select using (true);
create policy "Votes open write" on public.votes for insert with check (true);

-- Storage bucket for meme uploads
insert into storage.buckets (id, name, public)
values ('memes', 'memes', true)
on conflict (id) do nothing;

drop policy if exists "Public meme storage read"       on storage.objects;
drop policy if exists "Authenticated users upload memes" on storage.objects;
drop policy if exists "Anyone can upload memes"        on storage.objects;
create policy "Public meme storage read"
  on storage.objects for select using (bucket_id = 'memes');
create policy "Anyone can upload memes"
  on storage.objects for insert with check (bucket_id = 'memes');

drop policy if exists "Anyone can delete memes" on storage.objects;
create policy "Anyone can delete memes"
  on storage.objects for delete using (bucket_id = 'memes');

drop policy if exists "Memes deletable" on public.memes;
create policy "Memes deletable"
  on public.memes for delete using (true);

grant delete on public.memes to anon, authenticated;
grant delete on public.votes to anon, authenticated;
grant delete on public.room_members to anon, authenticated;

drop policy if exists "Members deletable" on public.room_members;
create policy "Members deletable"
  on public.room_members for delete using (true);

-- Enable Realtime for the tables that drive the synchronous flow.
-- Must come AFTER tables are created.
do $$
begin
  begin alter publication supabase_realtime add table public.rooms;
  exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.room_members;
  exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.memes;
  exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.votes;
  exception when duplicate_object then null; end;
end $$;

-- Force PostgREST to reload its schema cache (fixes
-- "Could not find the 'kicked_at' column in the schema cache").
notify pgrst, 'reload schema';
