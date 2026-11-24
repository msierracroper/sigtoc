import { supabase } from "../lib/supabaseClient";

// SLA global (tabla de una sola fila app_settings, id = true). Devuelve null si falla.
export async function fetchSlaSettings() {
  const { data, error } = await supabase.from("app_settings").select("sla_config").eq("id", true).single();
  if (error || !data?.sla_config) return null;
  return data.sla_config;
}

// Si la base rechaza el cambio por permisos (solo admin), no devuelve error sino 0 filas: se trata como error.
export async function saveSlaSettings(newSla) {
  const { data, error } = await supabase.from("app_settings").update({ sla_config: newSla }).eq("id", true).select("id");
  if (!error && !data?.length) return { error: { message: "sin permiso" } };
  return { error };
}
