-- Login lockout and emailed reset codes. Run once in Supabase → SQL Editor.
-- Safe to run again.

create table if not exists public.login_guards (
  email            text primary key,
  failed           int not null default 0,
  reset_user_id    uuid references auth.users(id) on delete cascade,
  reset_code_hash  text,
  reset_expires_at timestamptz,
  reset_failed     int not null default 0,
  reset_sent_at    timestamptz,
  updated_at       timestamptz not null default now()
);
alter table public.login_guards enable row level security;
-- Server-only (service role); no public policies.

-- Attempts are counted before the PIN is checked, so firing many requests at
-- once can't get more than the allowed guesses. Returns the new count, or -1
-- when the account is already locked.
create or replace function public.claim_login_attempt(p_email text, p_max int)
returns int
language plpgsql
set search_path = public
as $$
declare
  n int;
begin
  insert into public.login_guards (email, failed)
  values (p_email, 1)
  on conflict (email) do update
    set failed = public.login_guards.failed + 1, updated_at = now()
    where public.login_guards.failed < p_max
  returning failed into n;
  return coalesce(n, -1);
end;
$$;

-- Gives an attempt back when the check itself failed (e.g. network error).
create or replace function public.release_login_attempt(p_email text)
returns void
language sql
set search_path = public
as $$
  update public.login_guards set failed = greatest(failed - 1, 0) where email = p_email;
$$;

-- Same idea for reset codes. Returns -1 when there is no usable code.
create or replace function public.claim_reset_attempt(p_email text, p_max int)
returns int
language plpgsql
set search_path = public
as $$
declare
  n int;
begin
  update public.login_guards
     set reset_failed = reset_failed + 1, updated_at = now()
   where email = p_email
     and reset_code_hash is not null
     and reset_expires_at > now()
     and reset_failed < p_max
  returning reset_failed into n;
  return coalesce(n, -1);
end;
$$;

revoke all on function public.claim_login_attempt(text, int) from public, anon, authenticated;
revoke all on function public.release_login_attempt(text) from public, anon, authenticated;
revoke all on function public.claim_reset_attempt(text, int) from public, anon, authenticated;
grant execute on function public.claim_login_attempt(text, int) to service_role;
grant execute on function public.release_login_attempt(text) to service_role;
grant execute on function public.claim_reset_attempt(text, int) to service_role;
