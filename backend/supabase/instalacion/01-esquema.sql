-- =====================================================================
-- SIGTOC · Instalación en un proyecto de Supabase NUEVO (paso 1 de 2)
-- Pegar completo en Supabase → SQL Editor → Run.
-- Reúne, en orden, todas las migraciones de backend/supabase/migrations
-- excepto el cron de alertas (ese va en 02-cron-alertas.sql, después de
-- desplegar la Edge Function). Se puede correr más de una vez sin dañar nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 20260804194754_sigtoc_init_schema.sql
-- ---------------------------------------------------------------------

-- Tabla principal de pedidos (SIGTOC)
create table if not exists public.orders (
  id text primary key,
  cliente text not null default 'Cliente sin nombre',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  created_by_email text,
  status text not null default 'abierto',
  current_stage int not null default 1,
  sla_config jsonb not null default '{"1":30,"2":45,"3":20,"4":60}',
  stages jsonb not null default '{}',
  audit_log jsonb not null default '[]',
  whatsapp_log jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

-- Mantener updated_at al día
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- Seguridad a nivel de fila: cualquier usuario autenticado (equipo de SIGTOC)
-- puede leer y escribir todos los pedidos (single-tenant, un solo rol por ahora)
alter table public.orders enable row level security;

drop policy if exists "authenticated_full_access" on public.orders;
create policy "authenticated_full_access"
  on public.orders
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------
-- 20260804194806_sigtoc_storage_bucket.sql
-- ---------------------------------------------------------------------

-- Bucket privado para los PDF de pedidos (pedido + RUT)
insert into storage.buckets (id, name, public)
values ('pedido-pdfs', 'pedido-pdfs', false)
on conflict (id) do nothing;

-- Solo usuarios autenticados pueden subir y leer los PDFs
drop policy if exists "pdfs_authenticated_read" on storage.objects;
create policy "pdfs_authenticated_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'pedido-pdfs');

drop policy if exists "pdfs_authenticated_insert" on storage.objects;
create policy "pdfs_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'pedido-pdfs');

drop policy if exists "pdfs_authenticated_update" on storage.objects;
create policy "pdfs_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'pedido-pdfs');

-- ---------------------------------------------------------------------
-- 20260805005944_sigtoc_cancel_and_settings.sql
-- ---------------------------------------------------------------------

-- Campo para registrar cancelaciones anómalas del flujo (quién, cuándo, por qué)
alter table public.orders
  add column if not exists cancel_info jsonb default null;

-- Tabla de configuración global de SLA (una sola fila).
-- Pensada para en el futuro exponerse en un módulo de administración.
create table if not exists public.app_settings (
  id boolean primary key default true,
  sla_config jsonb not null default '{"1":30,"2":45,"3":20,"4":60}',
  updated_at timestamptz not null default now(),
  constraint single_row check (id)
);

insert into public.app_settings (id, sla_config)
values (true, '{"1":30,"2":45,"3":20,"4":60}')
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "authenticated_read_settings" on public.app_settings;
create policy "authenticated_read_settings"
  on public.app_settings for select to authenticated using (true);

drop policy if exists "authenticated_write_settings" on public.app_settings;
create policy "authenticated_write_settings"
  on public.app_settings for update to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- 20260805205306_sigtoc_push_notifications.sql
-- ---------------------------------------------------------------------

-- Suscripciones push por usuario/dispositivo
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  endpoint text unique not null,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "own_subscriptions_all" on public.push_subscriptions;
create policy "own_subscriptions_all"
  on public.push_subscriptions for all
  to authenticated
  using (true)
  with check (true);

-- Control de qué estado de SLA ya se notificó por pedido/etapa,
-- para no enviar el mismo aviso repetidamente.
alter table public.orders
  add column if not exists last_notified_state text default null,
  add column if not exists last_notified_at timestamptz default null;

-- ---------------------------------------------------------------------
-- 20261010120000_sigtoc_origins_payment.sql
-- ---------------------------------------------------------------------

-- Orígenes de venta (Shopify, Instagram, Facebook...). Se administran desde
-- Configuración en la app; un origen que ya no se usa se oculta (active = false)
-- en lugar de borrarse, para no romper los pedidos que lo referencian.
create table if not exists public.sale_origins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create unique index if not exists sale_origins_name_key on public.sale_origins (lower(name));

alter table public.sale_origins enable row level security;

drop policy if exists "authenticated_full_access" on public.sale_origins;
create policy "authenticated_full_access"
  on public.sale_origins
  for all
  to authenticated
  using (true)
  with check (true);

insert into public.sale_origins (name) values ('Shopify'), ('Instagram'), ('Facebook')
on conflict do nothing;

-- Pago del pedido (se puede marcar en cualquier etapa; la auditoría guarda quién y cuándo):
--   { paid, paidBy, paidAt, proofPath, proofBy, proofAt }
-- (El stand by y la preventa no necesitan columnas: viven en stages[n].pauses.)
alter table public.orders
  add column if not exists payment jsonb default null;

-- ---------------------------------------------------------------------
-- 20261011120000_sigtoc_carriers.sql
-- ---------------------------------------------------------------------

-- Transportadoras (Etapa 4 · Despacho). Se administran desde Configuración en la app,
-- igual que los orígenes de venta: una transportadora que ya no se usa se oculta
-- (active = false) en lugar de borrarse, para no romper los pedidos que la referencian.
create table if not exists public.carriers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create unique index if not exists carriers_name_key on public.carriers (lower(name));

alter table public.carriers enable row level security;

drop policy if exists "authenticated_full_access" on public.carriers;
create policy "authenticated_full_access"
  on public.carriers
  for all
  to authenticated
  using (true)
  with check (true);

-- Opciones iniciales (se pueden renombrar u ocultar desde la app)
insert into public.carriers (name)
values ('Servientrega'), ('Coordinadora'), ('Interrapidísimo'), ('Envía')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Realtime: los cambios de un dispositivo aparecen en los demás sin recargar
-- (sin esto la app funciona, pero el tablero de TV depende de su recarga cada 30 s)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'app_settings') then
    alter publication supabase_realtime add table public.app_settings;
  end if;
end $$;
