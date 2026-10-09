import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const SITE_URL = Deno.env.get("SITE_URL") || "";
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const STAGE_NAMES = { 1: "Ingreso de Pedido", 2: "Bodega", 3: "Facturación", 4: "Despacho y Entrega" };

function slaState(order, globalSla, now) {
  const stage = order.current_stage;
  const st = order.stages?.[stage];
  if (!st?.startedAt) return null;
  const limitMin = order.sla_config?.[stage] ?? globalSla?.[stage] ?? 30;
  const elapsedMin = (now - new Date(st.startedAt).getTime()) / 60000;
  if (elapsedMin >= limitMin) return "excedido";
  if (elapsedMin >= limitMin * 0.75) return "alerta";
  return "ok";
}

Deno.serve(async (req) => {
  try {
    if (CRON_SECRET && req.headers.get("x-cron-secret") !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: "missing_vapid_keys", VAPID_PUBLIC_KEY: !!VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY: !!VAPID_PRIVATE_KEY }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    webpush.setVapidDetails("mailto:soporte@sigtoc.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const now = Date.now();

    const { data: settingsRow, error: settingsErr } = await supabase.from("app_settings").select("sla_config").eq("id", true).single();
    if (settingsErr) return new Response(JSON.stringify({ error: "settings_error", detail: settingsErr }), { status: 500, headers: { "Content-Type": "application/json" } });
    const globalSla = settingsRow?.sla_config || { 1: 30, 2: 45, 3: 20, 4: 60 };

    const { data: orders, error: ordersErr } = await supabase.from("orders").select("*").eq("status", "abierto");
    if (ordersErr) return new Response(JSON.stringify({ error: "orders_error", detail: ordersErr }), { status: 500, headers: { "Content-Type": "application/json" } });

    const { data: subs, error: subsErr } = await supabase.from("push_subscriptions").select("*");
    if (subsErr) return new Response(JSON.stringify({ error: "subs_error", detail: subsErr }), { status: 500, headers: { "Content-Type": "application/json" } });

    if (!orders?.length || !subs?.length) {
      return new Response(JSON.stringify({ checked: orders?.length || 0, subs: subs?.length || 0, sent: 0 }), { headers: { "Content-Type": "application/json" } });
    }

    let sent = 0;
    const errors = [];

    for (const order of orders) {
      const state = slaState(order, globalSla, now);
      if ((state === "alerta" || state === "excedido") && order.last_notified_state !== state) {
        const stageName = STAGE_NAMES[order.current_stage];
        const title = state === "excedido" ? `SLA excedido - ${order.id}` : `SLA por vencer - ${order.id}`;
        const body = `${order.cliente} esta en ${stageName} y ${state === "excedido" ? "supero" : "esta por superar"} el tiempo limite.`;
        const payload = JSON.stringify({ title, body, url: `${SITE_URL}/?order=${order.id}`, tag: order.id });

        for (const sub of subs) {
          try {
            await webpush.sendNotification(sub.subscription, payload);
            sent++;
          } catch (err) {
            errors.push({ endpoint: sub.endpoint?.slice(0, 40), message: String(err?.message || err), statusCode: err?.statusCode });
            if (err.statusCode === 404 || err.statusCode === 410) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            }
          }
        }

        await supabase.from("orders").update({ last_notified_state: state, last_notified_at: new Date().toISOString() }).eq("id", order.id);
      } else if (state === "ok" && order.last_notified_state) {
        await supabase.from("orders").update({ last_notified_state: null }).eq("id", order.id);
      }
    }

    return new Response(JSON.stringify({ checked: orders.length, subs: subs.length, sent, errors }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "unhandled", message: String(err?.message || err), stack: String(err?.stack || "") }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
