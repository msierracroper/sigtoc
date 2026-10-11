// Estado de SLA de la etapa activa: "ok" | "alerta" (>=75% del límite) | "excedido" (>=100%) | "pausa" (stand by).
// El tiempo en stand by NO cuenta: se descuenta del transcurrido de la etapa.
// Debe mantenerse alineado con slaState() de backend/supabase/functions/sla-push-check.
export const ALERT_RATIO = 0.75;

// Pausa abierta (stand by) de la etapa activa, o null
export function activePause(order) {
  if (order.status !== "abierto") return null;
  const pauses = order.stages?.[order.current_stage]?.pauses;
  const last = pauses?.[pauses.length - 1];
  return last && !last.until ? last : null;
}

// Milisegundos en pausa de una etapa hasta `untilMs` (las pausas abiertas cuentan hasta untilMs)
export function pausedMs(stage, untilMs) {
  return (stage?.pauses || []).reduce((acc, p) => {
    const start = new Date(p.since).getTime();
    const end = p.until ? new Date(p.until).getTime() : untilMs;
    return acc + Math.max(0, Math.min(end, untilMs) - start);
  }, 0);
}

// Minutos efectivos de una etapa (sin el tiempo en stand by)
export function effectiveStageMinutes(stage, endMs) {
  const start = new Date(stage.startedAt).getTime();
  return Math.max(0, endMs - start - pausedMs(stage, endMs)) / 60000;
}

export function slaStatus(order, slaSettings, now) {
  if (order.status !== "abierto") return null;
  const stage = order.current_stage;
  const st = order.stages[stage];
  if (!st?.startedAt) return null;
  const limitMin = slaSettings?.[stage] ?? 30;
  const pause = activePause(order);
  const end = pause ? new Date(pause.since).getTime() : now; // en stand by el reloj queda congelado
  const elapsedMin = effectiveStageMinutes(st, end);
  const elapsedMs = elapsedMin * 60000;
  let state = "ok";
  if (pause) state = "pausa";
  else if (elapsedMin >= limitMin) state = "excedido";
  else if (elapsedMin >= limitMin * ALERT_RATIO) state = "alerta";
  return { state, paused: !!pause, pause, elapsedMs, elapsedMin, limitMin, ratio: elapsedMin / limitMin, remainingMin: limitMin - elapsedMin };
}

export function isAtRisk(sla) { return !!sla && (sla.state === "alerta" || sla.state === "excedido"); }

// Orden "mayor riesgo primero": abiertos por % de SLA consumido (excedidos arriba, en stand by al final de los abiertos),
// después los cerrados/cancelados del más reciente al más antiguo.
export function sortByRisk(orders, slaSettings, now) {
  const withSla = orders.map((o) => ({ o, sla: slaStatus(o, slaSettings, now) }));
  const rank = (sla) => (sla?.paused ? -1 : sla?.ratio ?? 0);
  return withSla.sort((a, b) => {
    const ao = a.o.status === "abierto", bo = b.o.status === "abierto";
    if (ao !== bo) return ao ? -1 : 1;
    if (ao) return rank(b.sla) - rank(a.sla);
    return new Date(b.o.updated_at || b.o.created_at) - new Date(a.o.updated_at || a.o.created_at);
  });
}
