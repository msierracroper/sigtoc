import { supabase } from "../lib/supabaseClient";

// Administración de cuentas (solo admin) vía la Edge Function admin-users.
// Devuelve { data } o { error: "mensaje legible" }.
const NOT_INSTALLED = "El módulo de usuarios no está instalado en el servidor: falta desplegar la función admin-users (ver IMPLEMENTACION.md, paso 4).";

async function call(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body: { action, ...payload } });
  if (error) {
    // Sin la función desplegada, Supabase responde 404 sin CORS y el navegador lo ve como fallo de red
    if (error.name === "FunctionsFetchError" || error.context?.status === 404) {
      return { error: navigator.onLine ? NOT_INSTALLED : "Sin conexión a internet. Inténtalo de nuevo." };
    }
    const detail = await error.context?.json?.().catch(() => null);
    return { error: detail?.error || "No se pudo completar la acción. Inténtalo de nuevo." };
  }
  return { data };
}

export const listUsers = () => call("list");
export const createUser = (u) => call("create", u); // { email, nombre, role, password? } → { id, password }
export const updateUser = (id, changes) => call("update", { id, ...changes }); // { email?, nombre?, role? }
export const resetPassword = (id, password) => call("reset", { id, password }); // password vacío = temporal generada → { password }
export const setUserActive = (id, active) => call("setActive", { id, active });
export const deleteUser = (id) => call("delete", { id });
