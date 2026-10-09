// Estado de SLA de la etapa activa: "ok" | "alerta" (>=75% del límite) | "excedido" (>=100%).
// Debe mantenerse alineado con slaState() de backend/supabase/functions/sla-push-check.
export function slaStatus(order, slaSettings, now) {
  if (order.status !== "abierto") return null;
  const stage = order.current_stage;
  const st = order.stages[stage];
  if (!st?.startedAt) return null;
  const limitMin = slaSettings?.[stage] ?? 30;
  const elapsedMs = now - new Date(st.startedAt).getTime();
  const elapsedMin = elapsedMs / 60000;
  let state = "ok";
  if (elapsedMin >= limitMin) state = "excedido";
  else if (elapsedMin >= limitMin * 0.75) state = "alerta";
  return { state, elapsedMs, limitMin };
}
