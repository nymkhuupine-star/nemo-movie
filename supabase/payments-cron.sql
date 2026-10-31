-- Checks payments every 2 minutes, so access opens even if the customer closed
-- the page. Replace both placeholders, then run once in Supabase → SQL Editor.
-- Safe to run again. Do not commit the filled-in version.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'nemo-payments-sync',
  '*/2 * * * *',
  $$
  select net.http_get(
    url := 'https://YOUR-SITE/api/payments/sync',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET'),
    timeout_milliseconds := 60000
  );
  $$
);
