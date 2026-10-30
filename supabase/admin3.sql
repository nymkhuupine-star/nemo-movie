-- Admin v3: backdrop image and video edit settings (logo, blur, trim).
-- Includes admin2.sql, so running only this file is enough. Safe to run again.

alter table public.movies add column if not exists is_hidden boolean not null default false;
alter table public.movies add column if not exists trend_order int;
alter table public.movies add column if not exists backdrop_url text;
-- { logoUrl, logoPos: "tl"|"tr"|"bl"|"br", logoSize, blurs: [{x,y,w,h}], startSec, endSec }
alter table public.movies add column if not exists edit jsonb not null default '{}'::jsonb;
