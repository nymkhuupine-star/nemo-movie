-- Website payments through QPay.
-- Run once in Supabase → SQL Editor (after admin.sql). Safe to run again.

create table if not exists public.payments (
  id               text primary key default gen_random_uuid()::text,
  user_id          uuid not null references auth.users(id) on delete cascade,
  kind             text not null check (kind in ('subscription', 'movie')),
  plan_id          text,
  days             int,                    -- access length when bought; prices and plans can change later
  movie_id         text references public.movies(id) on delete set null,
  title            text not null,
  amount           int  not null check (amount > 0),
  status           text not null default 'pending' check (status in ('pending', 'paid')),
  external_ref     text unique,            -- QPay payment id; stops double use
  qpay_invoice_id  text,
  qpay             jsonb,                  -- QR image and bank app links
  paid_at          timestamptz,
  created_at       timestamptz not null default now()
);
-- Columns from the earlier bank-transfer version of this table.
alter table public.payments
  drop column if exists code,
  drop column if exists bank_checked_at,
  drop column if exists paid_via;
-- The buyer's browser details for the Meta purchase event, which may come from QPay's callback.
alter table public.payments add column if not exists meta_browser jsonb;
create index if not exists payments_user_idx on public.payments (user_id, status);
create index if not exists payments_pending_idx on public.payments (created_at) where status = 'pending';
alter table public.payments enable row level security;
-- Server-only (service role); no public policies.

drop function if exists public.settle_payment(text, text, text);

-- Marks a payment paid and grants access in one transaction, so a crash can
-- never leave money taken with no access. Returns false if already settled or
-- if this QPay payment was already used.
create or replace function public.settle_payment(p_id text, p_ref text)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  p public.payments;
  period_start timestamptz;
  label text;
begin
  update public.payments
     set status = 'paid', external_ref = p_ref, paid_at = now()
   where id = p_id and status = 'pending'
  returning * into p;
  if not found then
    return false;
  end if;

  label := p.title || ' (' || to_char(p.amount, 'FM999,999,999') || '₮) · QPay';

  if p.kind = 'movie' then
    -- Invoices made before movies had a time limit (days is null) stay permanent.
    insert into public.entitlements (user_id, kind, movie_id, expires_at, note)
    values (p.user_id, 'movie', p.movie_id, now() + make_interval(days => p.days), label);
  else
    -- Renewing early adds to the current period instead of overlapping it.
    select greatest(now(), coalesce(max(expires_at), now())) into period_start
      from public.entitlements
     where user_id = p.user_id and kind = 'subscription' and expires_at > now();
    insert into public.entitlements (user_id, kind, plan_id, expires_at, note)
    values (p.user_id, 'subscription', p.plan_id, period_start + make_interval(days => p.days), label);
  end if;
  return true;
exception
  when unique_violation then
    return false;
end;
$$;

revoke all on function public.settle_payment(text, text) from public, anon, authenticated;
grant execute on function public.settle_payment(text, text) to service_role;
