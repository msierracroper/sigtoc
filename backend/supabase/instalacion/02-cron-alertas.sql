-- =====================================================================
-- SIGTOC · Instalación (paso 2 de 2): alertas push de SLA cada 3 minutos
-- Correr DESPUÉS de desplegar la Edge Function sla-push-check y de crear
-- su secreto CRON_SECRET. Antes de correrlo, reemplazar:
--   <PROJECT_REF>  → el id del proyecto (lo que va antes de .supabase.co)
--   <CRON_SECRET>  → el mismo valor del secreto CRON_SECRET de la función
-- =====================================================================

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Si ya existía (por ejemplo, al repetir la instalación), se reemplaza
select cron.unschedule('sla-push-check-every-3-min')
where exists (select 1 from cron.job where jobname = 'sla-push-check-every-3-min');

select cron.schedule(
  'sla-push-check-every-3-min',
  '*/3 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/sla-push-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
