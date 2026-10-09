
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
