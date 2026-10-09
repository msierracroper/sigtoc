import React, { useState, useEffect, useMemo } from "react";
import { Bell } from "lucide-react";
import { C, FONT_MONO } from "../../styles/tokens";
import { STAGES } from "../../constants/stages";
import { slaStatus } from "../../utils/sla";
import StatusPill from "../common/StatusPill";

export default function AlertBell({ orders, slaSettings, now, onOpenOrder }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);

  const alerts = useMemo(() => {
    return orders
      .map((o) => ({ order: o, sla: slaStatus(o, slaSettings, now) }))
      .filter((x) => x.sla && (x.sla.state === "alerta" || x.sla.state === "excedido"))
      .sort((a, b) => (a.sla.state === b.sla.state ? b.sla.elapsedMs - a.sla.elapsedMs : a.sla.state === "excedido" ? -1 : 1));
  }, [orders, slaSettings, now]);

  useEffect(() => {
    function onClickOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="relative p-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
        <Bell size={16} color="#fff" />
        {alerts.length > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center text-white font-bold rounded-full"
            style={{ backgroundColor: C.alert, fontSize: 9, minWidth: 16, height: 16, padding: "0 3px", border: `1.5px solid ${C.steelDark}` }}
          >
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-2 right-2 top-14 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 sm:max-w-[90vw] max-h-[75vh] rounded-lg overflow-hidden z-50 shadow-lg"
          style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
          <div className="px-3.5 py-2.5" style={{ borderBottom: `1px solid ${C.line}` }}>
            <p className="text-xs font-bold" style={{ color: C.ink }}>
              {alerts.length === 0 ? "Sin alertas activas" : `${alerts.length} pedido${alerts.length > 1 ? "s" : ""} con SLA en riesgo`}
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="text-xs px-3.5 py-4 text-center" style={{ color: C.inkFaint }}>Todo en orden por ahora.</p>
            ) : (
              alerts.map(({ order, sla }) => (
                <button key={order.id} onClick={() => { onOpenOrder(order.id); setOpen(false); }}
                  className="w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 hover:bg-black/[0.02]"
                  style={{ borderBottom: `1px solid ${C.line}` }}>
                  <div>
                    <p className="text-[11px] font-bold" style={{ color: C.ink, fontFamily: FONT_MONO }}>{order.id}</p>
                    <p className="text-[10px]" style={{ color: C.inkSoft }}>{order.cliente} · {STAGES[order.current_stage - 1].short}</p>
                  </div>
                  <StatusPill state={sla.state} />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
