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

-- ---------------------------------------------------------------------
-- 20261124120000_sigtoc_roles_activity.sql
-- ---------------------------------------------------------------------
-- =====================================================================
-- Roles (admin / operador) y registro de actividad de configuración
--
-- admin:    todo, incluida la configuración (SLA, orígenes de venta,
--           transportadoras) y los roles de los usuarios.
-- operador: todo el flujo de pedidos, sin tocar la configuración.
-- Las restricciones viven aquí (RLS), no solo en la pantalla.
--
-- La actividad de configuración la escriben triggers de la base: nadie
-- puede saltársela ni borrarla desde la app. La auditoría de cada pedido
-- sigue en orders.audit_log.
-- =====================================================================

-- ---------- roles ----------
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'operador' check (role in ('admin', 'operador')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin');
$$;

-- Todo usuario nuevo entra como operador
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.user_roles (user_id, email) values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_role on auth.users;
create trigger on_auth_user_created_role
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuarios que ya existían: quedan como admin (así nadie pierde acceso al instalar esto).
-- En una instalación nueva no hay usuarios todavía y esto no hace nada.
insert into public.user_roles (user_id, email, role)
select id, email, 'admin' from auth.users
on conflict (user_id) do nothing;

-- Nunca quedarse sin administradores
create or replace function public.keep_one_admin()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin')
     and not exists (select 1 from public.user_roles where role = 'admin' and user_id <> old.user_id) then
    raise exception 'Debe quedar al menos un administrador.';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_keep_one_admin on public.user_roles;
create trigger trg_keep_one_admin
  before update or delete on public.user_roles
  for each row execute function public.keep_one_admin();

alter table public.user_roles enable row level security;

drop policy if exists "roles_read" on public.user_roles;
create policy "roles_read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "roles_admin_update" on public.user_roles;
create policy "roles_admin_update" on public.user_roles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- configuración: lectura para todos, cambios solo admin ----------
drop policy if exists "authenticated_write_settings" on public.app_settings;
drop policy if exists "admin_write_settings" on public.app_settings;
create policy "admin_write_settings" on public.app_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "authenticated_full_access" on public.sale_origins;
drop policy if exists "catalog_read" on public.sale_origins;
drop policy if exists "catalog_admin_insert" on public.sale_origins;
drop policy if exists "catalog_admin_update" on public.sale_origins;
create policy "catalog_read" on public.sale_origins for select to authenticated using (true);
create policy "catalog_admin_insert" on public.sale_origins for insert to authenticated with check (public.is_admin());
create policy "catalog_admin_update" on public.sale_origins for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "authenticated_full_access" on public.carriers;
drop policy if exists "catalog_read" on public.carriers;
drop policy if exists "catalog_admin_insert" on public.carriers;
drop policy if exists "catalog_admin_update" on public.carriers;
create policy "catalog_read" on public.carriers for select to authenticated using (true);
create policy "catalog_admin_insert" on public.carriers for insert to authenticated with check (public.is_admin());
create policy "catalog_admin_update" on public.carriers for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- registro de actividad ----------
create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  user_id uuid,
  user_email text,
  entity text not null,      -- 'sla' | 'sale_origins' | 'carriers' | 'user_roles'
  entity_id text,
  action text not null,      -- texto legible
  details jsonb
);
create index if not exists activity_log_ts_idx on public.activity_log (ts desc);

alter table public.activity_log enable row level security;

-- Solo los admin la leen. No hay políticas de insert/update/delete: solo escriben los triggers.
drop policy if exists "activity_admin_read" on public.activity_log;
create policy "activity_admin_read" on public.activity_log for select to authenticated using (public.is_admin());

create or replace function public.log_activity(p_entity text, p_entity_id text, p_action text, p_details jsonb)
returns void
language sql security definer set search_path = public
as $$
  insert into public.activity_log (user_id, user_email, entity, entity_id, action, details)
  values (auth.uid(), coalesce(auth.jwt() ->> 'email', 'sistema'), p_entity, p_entity_id, p_action, p_details);
$$;
revoke execute on function public.log_activity(text, text, text, jsonb) from public, anon, authenticated;

create or replace function public.audit_sla()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.sla_config is distinct from old.sla_config then
    perform public.log_activity('sla', null, 'Configuración de SLA actualizada.',
      jsonb_build_object('antes', old.sla_config, 'despues', new.sla_config));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_sla on public.app_settings;
create trigger trg_audit_sla after update on public.app_settings
  for each row execute function public.audit_sla();

create or replace function public.audit_catalog()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  label text := case tg_table_name when 'sale_origins' then 'Origen de venta' else 'Transportadora' end;
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(tg_table_name, new.id::text, format('%s creado: %s.', label, new.name), null);
  else
    if new.name is distinct from old.name then
      perform public.log_activity(tg_table_name, new.id::text, format('%s renombrado: %s → %s.', label, old.name, new.name), null);
    end if;
    if new.active is distinct from old.active then
      perform public.log_activity(tg_table_name, new.id::text,
        format('%s %s: %s.', label, case when new.active then 'reactivado' else 'ocultado' end, new.name), null);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_origins on public.sale_origins;
create trigger trg_audit_origins after insert or update on public.sale_origins
  for each row execute function public.audit_catalog();

drop trigger if exists trg_audit_carriers on public.carriers;
create trigger trg_audit_carriers after insert or update on public.carriers
  for each row execute function public.audit_catalog();

create or replace function public.audit_roles()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity('user_roles', new.user_id::text, format('Usuario %s registrado como %s.', new.email, new.role), null);
  elsif new.role is distinct from old.role then
    perform public.log_activity('user_roles', new.user_id::text, format('Rol de %s cambiado: %s → %s.', new.email, old.role, new.role), null);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_roles on public.user_roles;
create trigger trg_audit_roles after insert or update on public.user_roles
  for each row execute function public.audit_roles();

-- ---------------------------------------------------------------------
-- 20261125120000_sigtoc_admin_users.sql
-- ---------------------------------------------------------------------
-- =====================================================================
-- Módulo de usuarios (crear, editar, restablecer contraseña, desactivar, eliminar)
--
-- Las cuentas las administra la Edge Function admin-users (solo admin).
-- Aquí: nombre visible en user_roles y que eliminar una cuenta no choque con
-- lo que esa persona registró. La historia no se pierde: los pedidos y su
-- auditoría guardan el correo de quien hizo cada cosa (created_by_email,
-- audit_log.user), solo se suelta el enlace interno a la cuenta borrada.
-- =====================================================================

alter table public.user_roles add column if not exists nombre text;

alter table public.orders drop constraint if exists orders_created_by_fkey;
alter table public.orders add constraint orders_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.sale_origins drop constraint if exists sale_origins_created_by_fkey;
alter table public.sale_origins add constraint sale_origins_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.carriers drop constraint if exists carriers_created_by_fkey;
alter table public.carriers add constraint carriers_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.push_subscriptions drop constraint if exists push_subscriptions_user_id_fkey;
alter table public.push_subscriptions add constraint push_subscriptions_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
