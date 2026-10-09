import React from "react";
import { C } from "../../styles/tokens";

// Tendencia de un KPI en el período (los días sin dato se omiten)
function Sparkline({ values }) {
  const pts = values.map((v, i) => [i, v]).filter(([, v]) => v !== null && v !== undefined);
  if (pts.length < 2) return <div className="h-[34px] mt-2" />;
  const max = Math.max(...pts.map(([, v]) => v)), min = Math.min(...pts.map(([, v]) => v));
  const span = max - min || 1;
  const n = values.length - 1 || 1;
  const xy = pts.map(([i, v]) => [(i / n) * 300, 30 - ((v - min) / span) * 26]);
  const last = xy[xy.length - 1];
  return (
    <div className="relative h-[34px] mt-2" aria-hidden="true">
      <svg width="100%" height="34" viewBox="0 0 300 34" preserveAspectRatio="none" className="overflow-visible">
        <polyline fill="none" stroke={C.seriesSoft} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
          points={xy.map((p) => p.join(",")).join(" ")} />
      </svg>
      <span className="absolute w-2 h-2 rounded-full bg-series ring-2 ring-surface -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${(last[0] / 300) * 100}%`, top: `${(last[1] / 34) * 100}%` }} />
    </div>
  );
}

// delta: { text, tone: "good" | "bad" | "neutral" }
export default function KpiCard({ label, value, delta, trend, help }) {
  const tone = delta?.tone === "good" ? "text-ok" : delta?.tone === "bad" ? "text-crit" : "text-ink2";
  return (
    <div className="card px-4 py-3.5 min-w-0">
      <p className="text-ink2 font-semibold text-[13px] leading-snug line-clamp-2 sm:truncate" title={help}>{label}</p>
      <div className="flex items-baseline flex-wrap gap-x-2 mt-1 num">
        <span className="text-[22px] sm:text-[26px] font-semibold tracking-tight">{value}</span>
        {delta && <span className={`text-[12.5px] font-semibold ${tone}`}>{delta.text}</span>}
      </div>
      {trend && <div className="hidden sm:block"><Sparkline values={trend} /></div>}
    </div>
  );
}
