import React, { useState, useEffect, useMemo, useRef } from "react";
import { Bell } from "lucide-react";
import { STAGES } from "../../constants/stages";
import { slaStatus, isAtRisk } from "../../utils/sla";
import { SlaBadge } from "../ui/Badge";

export default function AlertBell({ orders, slaSettings, now, onOpenOrder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const alerts = useMemo(() => {
    return orders
      .map((o) => ({ order: o, sla: slaStatus(o, slaSettings, now) }))
      .filter((x) => isAtRisk(x.sla))
      .sort((a, b) => b.sla.ratio - a.sla.ratio);
  }, [orders, slaSettings, now]);

  useEffect(() => {
    function onClickOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} aria-label={`Alertas de SLA: ${alerts.length}`}
        className="relative w-11 h-11 lg:w-[34px] lg:h-[34px] rounded-[9px] grid place-items-center text-[#E3E3E3] hover:bg-white/10">
        <Bell size={18} />
        {alerts.length > 0 && (
          <span className="absolute top-[7px] right-[7px] lg:top-[3px] lg:right-[3px] min-w-[16px] h-4 px-1 rounded-full bg-critBar text-white text-[10.5px] font-semibold grid place-items-center shadow-[0_0_0_2px_#1A1A1A] num">
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-2 right-2 top-14 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[340px] card shadow-pop overflow-hidden z-50 text-ink">
          <div className="px-4 py-3 border-b border-line2">
            <p className="text-[13.5px] font-semibold">
              {alerts.length === 0 ? "Sin alertas de SLA" : `${alerts.length} pedido${alerts.length > 1 ? "s" : ""} con SLA en riesgo`}
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="text-[13px] px-4 py-6 text-center text-ink2">Todos los pedidos abiertos van en tiempo.</p>
            ) : (
              alerts.map(({ order, sla }) => (
                <button key={order.id} onClick={() => { onOpenOrder(order.id); setOpen(false); }}
                  className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 border-b border-line2 last:border-0 hover:bg-surface2">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold truncate">{order.id}</p>
                    <p className="text-[12.5px] text-ink2 truncate">{order.cliente} · {STAGES[order.current_stage - 1].short}</p>
                  </div>
                  <SlaBadge sla={sla} compact />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
