-- Nemo Movie schema. Run once in Supabase → SQL Editor → New query → Run.
-- Safe to run again: everything uses IF NOT EXISTS / ON CONFLICT.

create table if not exists public.movies (
  id           text primary key default gen_random_uuid()::text,
  title        text not null,
  genre        text not null,
  year         int  not null default extract(year from now())::int,
  rating       numeric(3, 1) not null default 0,
  price        int  not null default 4900,
  duration     int,            -- minutes (movies)
  episodes     int,            -- episode count (series)
  is_new       boolean not null default false,
  featured     boolean not null default false,
  trending     boolean not null default false,
  description  text not null default '',
  poster_url   text,
  video_url    text,
  hue          int  not null default 280,
  created_at   timestamptz not null default now()
);

-- Anyone can read movies; only the server (service role key) can write.
alter table public.movies enable row level security;

drop policy if exists "Public can read movies" on public.movies;
create policy "Public can read movies"
  on public.movies for select
  using (true);

-- Public bucket for poster images.
insert into storage.buckets (id, name, public)
values ('posters', 'posters', true)
on conflict (id) do nothing;
