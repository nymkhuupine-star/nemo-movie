-- Admin features: plans, genres, hero order, user access, play stats.
-- Run once in Supabase → SQL Editor (after schema.sql and bunny.sql). Safe to run again.

-- Subscription plans (edited in /admin/plans).
create table if not exists public.plans (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  description text not null default '',
  price       int  not null,
  days        int  not null,
  badge       text,
  sort        int  not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.plans enable row level security;
drop policy if exists "Public can read plans" on public.plans;
create policy "Public can read plans" on public.plans for select using (true);

insert into public.plans (id, name, description, price, days, badge, sort) values
  ('week',  '7 хоногийн багц', '7 хоног бүх контент', 8900, 7, null, 1),
  ('month', 'Сарын багц',      'Сар бүх контент',     24900, 30, 'ХЯМД', 2)
on conflict (id) do nothing;

-- Genres / categories (edited in /admin/genres).
create table if not exists public.genres (
  slug  text primary key,
  name  text not null,
  sort  int  not null default 0
);
alter table public.genres enable row level security;
drop policy if exists "Public can read genres" on public.genres;
create policy "Public can read genres" on public.genres for select using (true);

insert into public.genres (slug, name, sort) values
  ('action', 'Action', 1), ('animation', 'Animation', 2), ('comedy', 'Comedy', 3),
  ('documentary', 'Documentary', 4), ('drama', 'Drama', 5), ('horror', 'Horror', 6),
  ('motivation', 'Motivation', 7), ('romance', 'Romance', 8), ('sci-fi', 'Sci-Fi', 9),
  ('thriller', 'Thriller', 10)
on conflict (slug) do nothing;

-- Order of featured movies in the home page hero (lower first).
alter table public.movies add column if not exists hero_order int;

-- Access granted to a user: a subscription (all content) or one movie/series.
create table if not exists public.entitlements (
  id          text primary key default gen_random_uuid()::text,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('subscription', 'movie')),
  movie_id    text references public.movies(id) on delete cascade,
  plan_id     text,
  expires_at  timestamptz,           -- null = never expires
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists entitlements_user_idx on public.entitlements (user_id);
alter table public.entitlements enable row level security;
-- Server-only (service role); no public policies.

-- One row per started playback, for the dashboard.
create table if not exists public.play_events (
  id          bigserial primary key,
  movie_id    text references public.movies(id) on delete cascade,
  episode     int,
  user_id     uuid,
  created_at  timestamptz not null default now()
);
create index if not exists play_events_created_idx on public.play_events (created_at);
alter table public.play_events enable row level security;
-- Server-only (service role); no public policies.
