-- NOTA (versionado en git): el valor real del header x-cron-secret se reemplazó por
-- un placeholder para no publicar el secreto. En la base de datos el job usa el
-- valor real de CRON_SECRET (el mismo configurado en los secrets de la Edge Function).

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'sla-push-check-every-3-min',
  '*/3 * * * *',
  $$
  select net.http_post(
    url := 'https://tpxglussuqmvhprrjwqz.supabase.co/functions/v1/sla-push-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
