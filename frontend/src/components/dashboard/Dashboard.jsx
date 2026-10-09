import React, { useState } from "react";
import { Package, LogOut, Plus, Search, Settings, BarChart3, Bell, BellOff } from "lucide-react";
import { C, FONT_MONO } from "../../styles/tokens";
import { STAGES } from "../../constants/stages";
import { fmtShort, fmtDuration } from "../../utils/format";
import { slaStatus } from "../../utils/sla";
import StatusPill from "../common/StatusPill";

/* ============ DASHBOARD ============ */
export default function Dashboard({ orders, now, slaSettings, onOpen, onNew, onOpenSettings, onOpenReports, pushEnabled, onTogglePush, email, onLogout }) {
  const [query, setQuery] = useState("");
  const filtered = orders.filter((o) => (o.id + " " + o.cliente).toLowerCase().includes(query.toLowerCase()));
  const abiertos = orders.filter((o) => o.status === "abierto").length;
  const alertas = orders.filter((o) => { const s = slaStatus(o, slaSettings, now); return s && (s.state === "alerta" || s.state === "excedido"); }).length;
  const today = new Date().toDateString();
  const cerradosHoy = orders.filter((o) => {
    const st4 = o.stages[4]?.completedAt;
    return st4 && new Date(st4).toDateString() === today;
  }).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-bold" style={{ color: C.ink, fontFamily: FONT_MONO }}>PANEL DE PEDIDOS</h2>
          <p className="text-xs mt-0.5" style={{ color: C.inkSoft }}>{orders.length} registrados · sesión: {email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onNew} className="flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-semibold text-white" style={{ backgroundColor: C.steel }}>
            <Plus size={14} /> Nuevo pedido
          </button>
          <button onClick={onTogglePush} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold"
            style={{ color: pushEnabled ? C.ok : C.inkSoft, border: `1px solid ${pushEnabled ? C.ok : C.line}` }}>
            {pushEnabled ? <Bell size={13} /> : <BellOff size={13} />} {pushEnabled ? "Push activo" : "Activar push"}
          </button>
          <button onClick={onOpenReports} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold" style={{ color: C.inkSoft, border: `1px solid ${C.line}` }}>
            <BarChart3 size={13} /> Reportes
          </button>
          <button onClick={onOpenSettings} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold" style={{ color: C.inkSoft, border: `1px solid ${C.line}` }}>
            <Settings size={13} /> SLA
          </button>
          <button onClick={onLogout} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold" style={{ color: C.inkSoft, border: `1px solid ${C.line}` }}>
            <LogOut size={13} /> Salir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: "Pedidos abiertos", val: abiertos, fg: C.steel },
          { label: "Alertas activas de SLA", val: alertas, fg: alertas > 0 ? C.alert : C.ok },
          { label: "Cerrados hoy", val: cerradosHoy, fg: C.ok },
        ].map((s) => (
          <div key={s.label} className="rounded-lg px-4 py-3" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.fg, fontFamily: FONT_MONO }}>{s.val}</p>
          </div>
        ))}
      </div>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color={C.inkFaint} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por ID o cliente..."
          className="w-full text-xs pl-8 pr-3 py-2.5 rounded outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-lg" style={{ backgroundColor: C.card, border: `1px dashed ${C.lineStrong}` }}>
          <Package size={28} color={C.inkFaint} className="mx-auto mb-2" />
          <p className="text-sm font-semibold" style={{ color: C.ink }}>Aún no hay pedidos</p>
          <p className="text-xs mt-1" style={{ color: C.inkSoft }}>Crea el primero para empezar a auditar el flujo.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.slice().reverse().map((o) => {
            const sla = slaStatus(o, slaSettings, now);
            const stage = STAGES[o.current_stage - 1];
            const barColor = o.status === "cerrado" ? C.ok : o.status === "cancelado" ? C.alert : sla ? { ok: C.ok, alerta: C.warn, excedido: C.alert }[sla.state] : C.line;
            const badge = o.status === "cerrado"
              ? { bg: C.okBg, fg: C.ok, label: "Entregado" }
              : o.status === "cancelado"
                ? { bg: C.alertBg, fg: C.alert, label: "Cancelado" }
                : { bg: C.steelSoft, fg: C.steel, label: "En proceso" };
            return (
              <button key={o.id} onClick={() => onOpen(o.id)}
                className="w-full text-left flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3.5 rounded-lg transition hover:shadow-sm"
                style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderLeft: `4px solid ${barColor}` }}>
                <div className="flex items-start justify-between gap-2 sm:contents">
                  <div className="sm:min-w-[150px]">
                    <p className="text-xs font-bold" style={{ color: C.ink, fontFamily: FONT_MONO }}>{o.id}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: C.inkSoft }}>{o.cliente}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-1 rounded flex-shrink-0 sm:hidden" style={{ backgroundColor: badge.bg, color: badge.fg }}>
                    {badge.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 sm:min-w-[160px]">
                  <stage.icon size={13} color={C.steel} />
                  <span className="text-xs font-medium" style={{ color: C.ink }}>{stage.name}</span>
                </div>
                <div className="hidden sm:block sm:min-w-[110px]">
                  <span className="text-[10px] font-bold uppercase px-2 py-1 rounded" style={{ backgroundColor: badge.bg, color: badge.fg }}>
                    {badge.label}
                  </span>
                </div>
                <div className="sm:min-w-[150px]">
                  {sla ? (
                    <div className="flex items-center gap-2">
                      <StatusPill state={sla.state} />
                      <span className="text-[11px]" style={{ color: C.inkFaint, fontFamily: FONT_MONO }}>{fmtDuration(sla.elapsedMs)}</span>
                    </div>
                  ) : <span className="text-[11px]" style={{ color: C.inkFaint }}>—</span>}
                </div>
                <div className="sm:ml-auto text-[11px]" style={{ color: C.inkFaint }}>{fmtShort(o.created_at)}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
