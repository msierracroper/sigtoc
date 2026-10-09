import React from "react";
import { C, FONT_MONO } from "../../styles/tokens";

export default function StatusPill({ state }) {
  const map = {
    ok: { bg: C.okBg, fg: C.ok, label: "En tiempo" },
    alerta: { bg: C.warnBg, fg: C.warn, label: "Por vencer" },
    excedido: { bg: C.alertBg, fg: C.alert, label: "SLA excedido" },
  };
  const s = map[state] || map.ok;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold"
      style={{ backgroundColor: s.bg, color: s.fg, fontFamily: FONT_MONO }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: s.fg }} />
      {s.label}
    </span>
  );
}
