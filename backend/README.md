# SIGTOC — Backend (Supabase)

Todo el backend vive en el proyecto Supabase `tpxglussuqmvhprrjwqz`. Esta carpeta versiona su código fuente:

```
backend/supabase/
├── config.toml                      # project_id + verify_jwt=false para sla-push-check
├── functions/
│   └── sla-push-check/index.ts      # Edge Function: alertas push de SLA (la llama pg_cron cada 3 min)
└── migrations/                      # SQL aplicado en la BD, en orden (mismos nombres que en Supabase)
    ├── 20260804194754_sigtoc_init_schema.sql          # tabla orders + trigger updated_at + RLS
    ├── 20260804194806_sigtoc_storage_bucket.sql       # bucket privado pedido-pdfs + policies
    ├── 20260805005944_sigtoc_cancel_and_settings.sql  # orders.cancel_info + tabla app_settings
    ├── 20260805205306_sigtoc_push_notifications.sql   # tabla push_subscriptions + last_notified_*
    └── 20260806195807_sigtoc_sla_push_cron.sql        # pg_cron + pg_net (secreto reemplazado por placeholder)
```

## Desplegar cambios

**Edge Function** (desde `./backend`, con la Supabase CLI):
```bash
supabase functions deploy sla-push-check --project-ref tpxglussuqmvhprrjwqz
```
`config.toml` ya fuerza `verify_jwt = false`. Si se despliega por otra vía (dashboard o MCP), hay que mantenerlo así: la función se autentica con el header `x-cron-secret`.

**Migraciones nuevas**: crear `migrations/<timestamp>_<nombre>.sql` y aplicarlo (`supabase db push` desde `./backend`, o con el conector MCP de Supabase usando el mismo nombre). Mantener esta carpeta sincronizada con lo que se aplica en la BD.

## Secretos

Los secretos de la Edge Function (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `SITE_URL`, `CRON_SECRET`) se configuran en Supabase → Edge Functions → Secrets. **Nunca** se guardan en este repo.
