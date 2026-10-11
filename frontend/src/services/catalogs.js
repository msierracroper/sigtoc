import { supabase } from "../lib/supabaseClient";

// Catálogos administrables desde Configuración: orígenes de venta (sale_origins) y transportadoras (carriers).
// Misma estructura en ambas tablas: { id, name, active }. Devuelve null si falla (p. ej. si el script aún no se corrió).
export const CATALOG_TABLES = { origins: "sale_origins", carriers: "carriers" };

export async function fetchCatalog(kind) {
  const { data, error } = await supabase.from(CATALOG_TABLES[kind]).select("id, name, active").order("name", { ascending: true });
  if (error) return null;
  return data || [];
}

export async function createCatalogItem(kind, name, userId) {
  const { error } = await supabase.from(CATALOG_TABLES[kind]).insert({ name: name.trim(), created_by: userId });
  return { error };
}

export async function updateCatalogItem(kind, id, changes) {
  const { error } = await supabase.from(CATALOG_TABLES[kind]).update(changes).eq("id", id);
  return { error };
}
