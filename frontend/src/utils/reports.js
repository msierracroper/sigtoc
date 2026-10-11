import { STAGES } from "../constants/stages";
import { effectiveStageMinutes, pausedMs } from "./sla";

const DAY = 86400000;

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

// Período [from, to) de N días que termina hoy (incluido), y el período anterior de igual largo
export function periodRange(days, now = Date.now()) {
  const to = startOfDay(now).getTime() + DAY;
  const from = to - days * DAY;
  return { from, to, prevFrom: from - days * DAY, prevTo: from, days };
}

export function inRange(o, from, to) {
  const t = new Date(o.created_at).getTime();
  return t >= from && t < to;
}

function stageLimit(o, stageId, slaSettings) { return o.sla_config?.[stageId] ?? slaSettings[stageId] ?? 30; }

// Duración efectiva de una etapa completada: sin el tiempo en stand by
function stageMinutes(st) { return effectiveStageMinutes(st, new Date(st.completedAt).getTime()); }

// Flujo completo (creación → entrega) sin el tiempo total en stand by
function flowMinutes(o) {
  const start = o.stages[1]?.startedAt, end = o.stages[4]?.completedAt;
  if (o.status !== "cerrado" || !start || !end) return null;
  const endMs = new Date(end).getTime();
  const paused = STAGES.reduce((acc, s) => acc + pausedMs(o.stages[s.id], endMs), 0);
  return Math.max(0, endMs - new Date(start).getTime() - paused) / 60000;
}

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

// Métricas resumen de un conjunto de pedidos
export function summarize(orders, slaSettings) {
  let ok = 0, total = 0;
  const perStage = Object.fromEntries(STAGES.map((s) => [s.id, { ok: 0, total: 0, mins: [] }]));
  for (const o of orders) {
    for (const s of STAGES) {
      const st = o.stages[s.id];
      if (st?.startedAt && st?.completedAt) {
        const m = stageMinutes(st);
        const within = m <= stageLimit(o, s.id, slaSettings);
        perStage[s.id].total += 1; perStage[s.id].mins.push(m);
        total += 1;
        if (within) { ok += 1; perStage[s.id].ok += 1; }
      }
    }
  }
  const flows = orders.map(flowMinutes).filter((v) => v !== null);
  return {
    created: orders.length,
    compliance: total ? (100 * ok) / total : null,
    avgFlow: mean(flows),
    anomalies: orders.filter((o) => o.status === "cancelado").length,
    stages: STAGES.map((s) => {
      const p = perStage[s.id];
      return {
        id: s.id, name: s.short,
        compliance: p.total ? (100 * p.ok) / p.total : null,
        samples: p.total,
        avgMin: mean(p.mins),
        limit: slaSettings[s.id] ?? 30,
      };
    }),
  };
}

// Serie diaria del período: una entrada por día, incluidos los días sin pedidos
export function dailySeries(orders, range, slaSettings) {
  const days = [];
  for (let t = range.from; t < range.to; t += DAY) {
    const dayOrders = orders.filter((o) => inRange(o, t, t + DAY));
    const s = summarize(dayOrders, slaSettings);
    const exceeded = dayOrders.filter((o) => STAGES.some((st) => {
      const x = o.stages[st.id];
      return x?.startedAt && x?.completedAt && stageMinutes(x) > stageLimit(o, st.id, slaSettings);
    })).length;
    days.push({ date: t, created: s.created, compliance: s.compliance, avgFlow: s.avgFlow, anomalies: s.anomalies, exceeded });
  }
  return days;
}

// Pedidos que más tiempo pasaron sobre el límite (en la peor de sus etapas)
export function topExceeded(orders, slaSettings, now, limit = 5) {
  const rows = [];
  for (const o of orders) {
    let worst = null;
    for (const s of STAGES) {
      const st = o.stages[s.id];
      if (!st?.startedAt) continue;
      const running = !st.completedAt && o.status === "abierto" && o.current_stage === s.id;
      if (!st.completedAt && !running) continue;
      const openPause = running ? (st.pauses || []).find((p) => !p.until) : null;
      const end = st.completedAt ? new Date(st.completedAt).getTime() : openPause ? new Date(openPause.since).getTime() : now;
      const over = effectiveStageMinutes(st, end) - stageLimit(o, s.id, slaSettings);
      if (over > 0 && (!worst || over > worst.over)) worst = { over, stage: s.short, running };
    }
    if (worst) rows.push({ order: o, ...worst });
  }
  return rows.sort((a, b) => b.over - a.over).slice(0, limit);
}

export function recentAnomalies(orders, limit = 8) {
  return orders.filter((o) => o.status === "cancelado" && o.cancel_info)
    .sort((a, b) => new Date(b.cancel_info.at) - new Date(a.cancel_info.at)).slice(0, limit);
}
