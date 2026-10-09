
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
