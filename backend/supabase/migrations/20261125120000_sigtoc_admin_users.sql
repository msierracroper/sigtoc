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
