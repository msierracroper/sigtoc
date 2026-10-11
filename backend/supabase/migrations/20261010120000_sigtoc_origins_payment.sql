
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
