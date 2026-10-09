
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
