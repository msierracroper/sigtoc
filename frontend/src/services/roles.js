import { supabase } from "../lib/supabaseClient";

// Roles: "admin" (todo, incluida la configuración) u "operador" (flujo de pedidos).
// Las reglas reales están en la base (RLS); aquí solo se decide qué mostrar.
export const ROLES = { admin: "Administrador", operador: "Operador" };

// Rol del usuario con sesión. Si la tabla de roles aún no existe (script sin correr en la demo),
// se asume admin para no cambiar el comportamiento anterior; la base sigue mandando.
export async function fetchMyRole(userId) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  if (error) return /user_roles|PGRST205|42P01/.test(`${error.code} ${error.message}`) ? "admin" : "operador";
  return data?.role || "operador";
}

// Actividad de configuración (solo admin; la escriben triggers de la base)
export async function fetchActivity(limit = 500) {
  const { data, error } = await supabase.from("activity_log").select("id, ts, user_email, entity, action, details").order("ts", { ascending: false }).limit(limit);
  if (error) return null;
  return data;
}
