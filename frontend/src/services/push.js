import { supabase, VAPID_PUBLIC_KEY } from "../lib/supabaseClient";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

// Registra public/sw.js y avisa si este dispositivo ya tiene suscripción push
export function registerServiceWorker(onSubscribed) {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").then((reg) => {
    reg.pushManager.getSubscription().then((s) => onSubscribed(!!s));
  }).catch(() => {});
}

export async function getPushSubscription() {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function unsubscribePush(existing) {
  await supabase.from("push_subscriptions").delete().eq("endpoint", existing.endpoint);
  await existing.unsubscribe();
}

// Pide permiso, suscribe el dispositivo y lo guarda en push_subscriptions. Devuelve false si no hay permiso.
export async function subscribePush(userId) {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  await supabase.from("push_subscriptions").upsert(
    { user_id: userId, endpoint: subscription.endpoint, subscription: subscription.toJSON() },
    { onConflict: "endpoint" }
  );
  return true;
}
