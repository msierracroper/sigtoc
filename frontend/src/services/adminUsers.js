import { supabase } from "../lib/supabaseClient";

// Administración de cuentas (solo admin) vía la Edge Function admin-users.
// Devuelve { data } o { error: "mensaje legible" }.
async function call(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body: { action, ...payload } });
  if (error) {
    const detail = await error.context?.json?.().catch(() => null);
    return { error: detail?.error || "No se pudo completar la acción. Revisa tu conexión e inténtalo de nuevo." };
  }
  return { data };
}

export const listUsers = () => call("list");
export const createUser = (u) => call("create", u); // { email, nombre, role } → { id, password }
export const updateUser = (id, changes) => call("update", { id, ...changes }); // { email?, nombre?, role? }
export const resetPassword = (id) => call("reset", { id }); // → { password }
export const setUserActive = (id, active) => call("setActive", { id, active });
export const deleteUser = (id) => call("delete", { id });
