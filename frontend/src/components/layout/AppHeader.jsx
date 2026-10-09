import React from "react";
import { Clock, ClipboardList } from "lucide-react";
import { C, FONT_MONO } from "../../styles/tokens";
import { fmtClock } from "../../utils/format";
import AlertBell from "./AlertBell";

export default function AppHeader({ orders, slaSettings, now, onOpenOrder }) {
  return (
    <header className="sticky top-0 z-40" style={{ backgroundColor: C.steelDark }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ClipboardList size={18} color="#fff" />
          <span className="text-sm font-bold text-white tracking-wide" style={{ fontFamily: FONT_MONO }}>SIGTOC</span>
        </div>
        <div className="flex items-center gap-3">
          <AlertBell orders={orders} slaSettings={slaSettings} now={now} onOpenOrder={onOpenOrder} />
          <div className="flex items-center gap-2 text-[11px] text-white/70" style={{ fontFamily: FONT_MONO }}>
            <Clock size={12} /> {fmtClock(new Date(now))}
          </div>
        </div>
      </div>
    </header>
  );
}
