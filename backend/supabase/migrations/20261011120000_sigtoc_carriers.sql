
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
