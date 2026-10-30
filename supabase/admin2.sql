-- Admin v2: hide movies from the site, and order the "trending" row.
-- Run once in Supabase → SQL Editor (after admin.sql). Safe to run again.

alter table public.movies add column if not exists is_hidden boolean not null default false;
alter table public.movies add column if not exists trend_order int;
