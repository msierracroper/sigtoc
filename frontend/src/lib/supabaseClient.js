import { createClient } from "@supabase/supabase-js";

// Conexión al proyecto de Supabase de cada instalación. Sale solo de variables de entorno
// (Vercel → Settings → Environment Variables; en local, frontend/.env.local) para que una
// instalación nunca termine apuntando a otra por un valor por defecto.
// La anon key es pública por diseño: el acceso real lo protegen las políticas RLS.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. Ver frontend/.env.example.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const PDF_BUCKET = "pedido-pdfs";

// Clave pública VAPID de las alertas push (par de la VAPID_PRIVATE_KEY de la Edge Function sla-push-check)
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";
