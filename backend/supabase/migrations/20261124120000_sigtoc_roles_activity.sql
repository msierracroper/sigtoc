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
