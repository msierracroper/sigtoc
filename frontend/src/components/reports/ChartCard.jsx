import React from "react";
import { C } from "../../styles/tokens";

export default function ChartCard({ title, children, height = 230 }) {
  return (
    <div className="rounded-lg p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
      <h5 className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: C.inkSoft }}>{title}</h5>
      <div style={{ height }}>{children}</div>
    </div>
  );
}
