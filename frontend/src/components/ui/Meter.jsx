import React from "react";
import { STAGES } from "../../constants/stages";

const BAR = { excedido: "bg-critBar", alerta: "bg-warnBar", ok: "bg-okBar" };

// Barra de consumo del SLA de la etapa (verde → ámbar al 75 % → rojo al 100 %)
export function SlaMeter({ sla, className = "" }) {
  const pct = Math.min(100, Math.max(3, (sla?.ratio ?? 0) * 100));
  return (
    <div className={`h-1.5 rounded-full bg-line2 overflow-hidden ${className}`}>
      <div className={`h-full rounded-full ${BAR[sla?.state] || "bg-okBar"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Progreso del pedido en las 4 etapas: completadas en verde, la activa con el color de su SLA
export function StageTrack({ order, sla, className = "" }) {
  const closed = order.status !== "abierto";
  return (
    <div className={`flex gap-0.5 ${className}`} aria-label={`Etapa ${order.current_stage} de 4`}>
      {STAGES.map((s) => {
        const done = !!order.stages[s.id]?.completedAt;
        const active = !closed && order.current_stage === s.id;
        let cls = "bg-line2";
        if (closed) cls = done || (order.status === "cancelado" && s.id <= order.current_stage) ? "bg-[#B5B5B5]" : "bg-line2";
        else if (done) cls = "bg-okBar";
        else if (active) cls = sla?.state === "excedido" ? "bg-critBar" : sla?.state === "alerta" ? "bg-warnBar" : "bg-infoBar";
        return <span key={s.id} className={`flex-1 h-1 rounded-full ${cls}`} />;
      })}
    </div>
  );
}
