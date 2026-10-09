import React from "react";
import { fmtMinutes } from "../../utils/format";

export const SLA_TARGET = 80;

// Cumplimiento por etapa, con la meta marcada. "Sin datos" es explícito (no se confunde con 0 %).
export function ComplianceBars({ stages }) {
  return (
    <div>
      <div className="space-y-3">
        {stages.map((s) => {
          const pct = s.compliance === null ? null : Math.round(s.compliance); // color y texto usan la misma cifra
          const color = pct === null ? "" : pct >= SLA_TARGET ? "bg-okBar" : pct >= 50 ? "bg-warnBar" : "bg-critBar";
          return (
            <div key={s.id} className="grid grid-cols-[84px_1fr_52px] sm:grid-cols-[96px_1fr_56px] items-center gap-2.5 text-[13.5px] sm:text-[13px]">
              <span className="text-ink2 truncate">{s.name}</span>
              <span className="relative h-5 rounded-r bg-surface2" title={pct === null ? "Sin etapas completadas en el período" : `${pct} % de ${s.samples} etapas dentro del límite`}>
                {pct !== null && <span className={`absolute inset-y-0 left-0 rounded-r ${color}`} style={{ width: `${Math.max(pct, 1)}%` }} />}
                <span className="absolute -inset-y-1 w-px bg-ink3" style={{ left: `${SLA_TARGET}%` }} />
              </span>
              <span className={`text-right font-semibold num ${pct === null ? "text-ink3 font-normal" : ""}`}>{pct === null ? "Sin datos" : `${pct} %`}</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-[12px] text-ink2">
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-okBar" />Sobre la meta</span>
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-warnBar" />Bajo la meta</span>
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-critBar" />Bajo 50 %</span>
        <span className="flex items-center gap-1.5"><i className="w-px h-3 bg-ink3" />Meta {SLA_TARGET} %</span>
      </div>
    </div>
  );
}

// Tiempo promedio por etapa frente a su límite (la línea vertical es el límite de cada etapa)
export function TimeVsLimit({ stages }) {
  const max = Math.max(...stages.map((s) => Math.max(s.limit, s.avgMin ?? 0))) * 1.1 || 1;
  return (
    <div className="space-y-3">
      {stages.map((s) => {
        const over = s.avgMin !== null && s.avgMin > s.limit;
        return (
          <div key={s.id} className="grid grid-cols-[84px_1fr] sm:grid-cols-[96px_1fr] items-center gap-2.5 text-[13.5px] sm:text-[13px]">
            <span className="text-ink2 truncate">{s.name}</span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative h-5 flex-1 rounded-r bg-surface2" title={s.avgMin === null ? "Sin datos" : `Promedio ${fmtMinutes(s.avgMin)} · límite ${s.limit} min`}>
                {s.avgMin !== null && <span className={`absolute inset-y-0 left-0 rounded-r ${over ? "bg-warnBar" : "bg-series"}`} style={{ width: `${(s.avgMin / max) * 100}%` }} />}
                <span className="absolute -inset-y-1 w-0.5 bg-ink rounded" style={{ left: `${(s.limit / max) * 100}%` }} />
              </span>
              <span className={`w-[118px] sm:w-[150px] flex-none num ${over ? "text-warn font-semibold" : "text-ink2"}`}>
                {s.avgMin === null ? "Sin datos" : `${Math.round(s.avgMin)} de ${s.limit} min${over ? " · sobre el límite" : ""}`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
