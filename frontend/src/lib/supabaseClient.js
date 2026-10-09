import { createClient } from "@supabase/supabase-js";

// Proyecto SIGTOC en Supabase.
// La anon key es pública por diseño: el acceso real está protegido por
// las políticas de Row Level Security (RLS) configuradas en la base de datos.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://tpxglussuqmvhprrjwqz.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRweGdsdXNzdXFtdmhwcnJqd3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NjU3MDQsImV4cCI6MjEwMTQ0MTcwNH0.mHak_G9n384IJaQxU18Sc6kupuR8HPkf0PfYsXEvgqI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const PDF_BUCKET = "pedido-pdfs";

export const VAPID_PUBLIC_KEY =
  "BLXxMMSqlCgnRSMYgAgIJeaG4tgNkKcXZXRWmfILCb8Zogf9wyWYBZJjofvoM09QzOmRoLr98MeXBe2cZmCTzUY";
