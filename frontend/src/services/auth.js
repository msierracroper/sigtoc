import { supabase } from "../lib/supabaseClient";

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Devuelve la función para cancelar la suscripción
export function onAuthChange(callback) {
  const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => callback(s));
  return () => sub.subscription.unsubscribe();
}

export function signUp(email, password) {
  return supabase.auth.signUp({ email, password });
}

export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signOut() {
  return supabase.auth.signOut();
}
