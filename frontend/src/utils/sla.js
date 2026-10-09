// Estado de SLA de la etapa activa: "ok" | "alerta" (>=75% del límite) | "excedido" (>=100%).
// Debe mantenerse alineado con slaState() de backend/supabase/functions/sla-push-check.
export const ALERT_RATIO = 0.75;

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
  else if (elapsedMin >= limitMin * ALERT_RATIO) state = "alerta";
  return { state, elapsedMs, elapsedMin, limitMin, ratio: elapsedMin / limitMin, remainingMin: limitMin - elapsedMin };
}

export function isAtRisk(sla) { return !!sla && (sla.state === "alerta" || sla.state === "excedido"); }

// Orden "mayor riesgo primero": abiertos por % de SLA consumido (excedidos arriba),
// después los cerrados/cancelados del más reciente al más antiguo.
export function sortByRisk(orders, slaSettings, now) {
  const withSla = orders.map((o) => ({ o, sla: slaStatus(o, slaSettings, now) }));
  return withSla.sort((a, b) => {
    const ao = a.o.status === "abierto", bo = b.o.status === "abierto";
    if (ao !== bo) return ao ? -1 : 1;
    if (ao) return (b.sla?.ratio ?? 0) - (a.sla?.ratio ?? 0);
    return new Date(b.o.updated_at || b.o.created_at) - new Date(a.o.updated_at || a.o.created_at);
  });
}
