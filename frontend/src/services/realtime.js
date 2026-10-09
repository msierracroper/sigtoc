import { supabase } from "../lib/supabaseClient";

// Escucha cambios en orders y app_settings (Supabase Realtime). Devuelve la función para desuscribirse.
export function subscribeToChanges({ onOrders, onSettings }) {
  const channel = supabase
    .channel("orders-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => onOrders())
    .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, () => onSettings())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
