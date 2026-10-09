import { supabase } from "../lib/supabaseClient";

// SLA global (tabla de una sola fila app_settings, id = true). Devuelve null si falla.
export async function fetchSlaSettings() {
  const { data, error } = await supabase.from("app_settings").select("sla_config").eq("id", true).single();
  if (error || !data?.sla_config) return null;
  return data.sla_config;
}

export async function saveSlaSettings(newSla) {
  const { error } = await supabase.from("app_settings").update({ sla_config: newSla }).eq("id", true);
  return { error };
}
