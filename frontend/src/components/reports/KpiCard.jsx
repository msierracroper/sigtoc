import React from "react";
import { C, FONT_MONO } from "../../styles/tokens";

export default function KpiCard({ icon: Icon, label, value, fg }) {
  return (
    <div className="rounded-lg px-4 py-3.5 flex items-start gap-3" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
      <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: C.paperDark }}>
        <Icon size={15} color={fg} />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>{label}</p>
        <p className="text-xl font-bold mt-0.5" style={{ color: fg, fontFamily: FONT_MONO }}>{value}</p>
      </div>
    </div>
  );
}
