-- Bunny Stream video support. Run once in Supabase → SQL Editor (after schema.sql).
-- Safe to run again.

-- One row per playable video: a movie has episode 1, a series has 1..N.
create table if not exists public.videos (
  id              text primary key default gen_random_uuid()::text,
  movie_id        text not null references public.movies(id) on delete cascade,
  episode         int  not null default 1,
  bunny_video_id  text not null,
  created_at      timestamptz not null default now(),
  unique (movie_id, episode)
);

-- RLS on with no policies: only the server (service role key) can read it,
-- so Bunny video ids stay private and playback links are signed server-side.
alter table public.videos enable row level security;
