import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, ArrowLeft, ClipboardList, Bell } from "lucide-react";
import { C, FONT_MONO } from "../../styles/tokens";
import { STAGES } from "../../constants/stages";
import { fmtShort, fmtDuration } from "../../utils/format";
import { slaStatus } from "../../utils/sla";
import StatusPill from "../common/StatusPill";
import Perforation from "./Perforation";
import CancelBox from "./CancelBox";
import StageForm from "./stages/StageForm";
import StageHistoryModal from "./stages/StageHistoryModal";

export default function OrderDetail({ order, now, slaSettings, onBack, onFinalizeStage, onCancelOrder, onEditStage }) {
  const [viewingStage, setViewingStage] = useState(null);
  const sla = slaStatus(order, slaSettings, now);
  const statusMap = {
    cerrado: { label: "Entregado", bg: C.okBg, fg: C.ok },
    cancelado: { label: "Cancelado", bg: C.alertBg, fg: C.alert },
    abierto: { label: "En proceso", bg: C.steelSoft, fg: C.steel },
  };
  const st = statusMap[order.status] || statusMap.abierto;
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold mb-4" style={{ color: C.inkSoft }}>
        <ArrowLeft size={14} /> Volver al panel
      </button>

      {order.status === "cancelado" && order.cancel_info && (
        <div className="rounded-lg p-4 mb-4 flex items-start gap-3" style={{ backgroundColor: C.alertBg, border: `1px solid ${C.alert}` }}>
          <AlertTriangle size={18} color={C.alert} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold" style={{ color: C.alert }}>Pedido finalizado por anomalía</p>
            <p className="text-xs mt-1" style={{ color: C.ink }}>{order.cancel_info.reason}</p>
            <p className="text-[11px] mt-1" style={{ color: C.inkSoft }}>
              Registrado por {order.cancel_info.by} · {fmtShort(order.cancel_info.at)}
            </p>
          </div>
        </div>
      )}

      <div className="flex rounded-lg overflow-hidden mb-6" style={{ border: `1px solid ${C.line}` }}>
        <div className="flex-1 p-5" style={{ backgroundColor: C.card }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.inkFaint }}>ID único de pedido</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: C.ink, fontFamily: FONT_MONO }}>{order.id}</p>
              <p className="text-xs mt-1" style={{ color: C.inkSoft }}>{order.cliente}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded" style={{ backgroundColor: st.bg, color: st.fg }}>
                {st.label}
              </span>
              {sla && <div className="mt-2"><StatusPill state={sla.state} /></div>}
            </div>
          </div>
          <div className="flex gap-6 mt-4 pt-3" style={{ borderTop: `1px dashed ${C.line}` }}>
            <div>
              <p className="text-[10px] uppercase font-semibold" style={{ color: C.inkFaint }}>Creado</p>
              <p className="text-xs mt-0.5" style={{ color: C.ink }}>{fmtShort(order.created_at)} · {order.created_by_email}</p>
            </div>
            {sla && (
              <div>
                <p className="text-[10px] uppercase font-semibold" style={{ color: C.inkFaint }}>Tiempo en etapa actual</p>
                <p className="text-xs mt-0.5 font-semibold" style={{ color: C.ink, fontFamily: FONT_MONO }}>
                  {fmtDuration(sla.elapsedMs)} / límite {sla.limitMin} min
                </p>
              </div>
            )}
          </div>
        </div>
        <Perforation />
      </div>

      <div className="flex items-center mb-6 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
        {STAGES.map((s, idx) => {
          const stg = order.stages[s.id] || {};
          const done = !!stg.completedAt;
          const active = order.current_stage === s.id && order.status === "abierto";
          const color = done ? C.ok : active ? C.steel : C.inkFaint;
          const versionCount = (stg.editHistory?.length || 0) + 1;
          return (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center" style={{ minWidth: 90 }}>
                <button
                  onClick={() => done && setViewingStage(s)}
                  className="w-9 h-9 rounded-full flex items-center justify-center relative"
                  style={{ backgroundColor: done ? C.okBg : active ? C.steelSoft : C.paperDark, border: `2px solid ${color}`, cursor: done ? "pointer" : "default" }}
                >
                  {done ? <CheckCircle2 size={16} color={color} /> : <s.icon size={15} color={color} />}
                  {done && versionCount > 1 && (
                    <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold text-white rounded-full flex items-center justify-center"
                      style={{ backgroundColor: C.steel, width: 15, height: 15 }}>v{versionCount}</span>
                  )}
                </button>
                <span className="text-[10px] font-semibold mt-1.5 text-center" style={{ color }}>{s.short}</span>
                <span className="text-[10px]" style={{ color: done ? C.steel : C.inkFaint, fontFamily: FONT_MONO, textDecoration: done ? "underline" : "none" }}>
                  {done ? "ver detalle" : active ? "en curso" : "pendiente"}
                </span>
              </div>
              {idx < STAGES.length - 1 && <div className="flex-1 h-0.5 mx-1" style={{ backgroundColor: done ? C.ok : C.line }} />}
            </React.Fragment>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <div className="rounded-lg p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
            {order.status === "cerrado" ? (
              <div className="text-center py-6">
                <CheckCircle2 size={26} color={C.ok} className="mx-auto mb-2" />
                <p className="text-sm font-bold" style={{ color: C.ink }}>Pedido cerrado y entregado</p>
                <p className="text-xs mt-1" style={{ color: C.inkSoft }}>Todas las etapas quedaron registradas en la auditoría.</p>
              </div>
            ) : order.status === "cancelado" ? (
              <div className="text-center py-6">
                <AlertTriangle size={26} color={C.alert} className="mx-auto mb-2" />
                <p className="text-sm font-bold" style={{ color: C.ink }}>Pedido finalizado por anomalía</p>
                <p className="text-xs mt-1" style={{ color: C.inkSoft }}>Revisa el motivo registrado arriba.</p>
              </div>
            ) : (
              <>
                <h4 className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: C.steel }}>
                  Etapa {order.current_stage} · {STAGES[order.current_stage - 1].name}
                </h4>
                <p className="text-xs mb-4" style={{ color: C.inkSoft }}>{STAGES[order.current_stage - 1].desc}</p>
                <StageForm orderId={order.id} stageId={order.current_stage} onFinalize={(data) => onFinalizeStage(order.current_stage, data)} />
                <CancelBox onCancel={onCancelOrder} />
              </>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-lg p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
            <h5 className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5 mb-2.5" style={{ color: C.inkSoft }}>
              <ClipboardList size={13} /> Registro de auditoría
            </h5>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {order.audit_log.slice().reverse().map((a, i) => (
                <div key={i} className="text-[11px] px-2 py-1.5 rounded" style={{ backgroundColor: C.paperDark }}>
                  <span className="font-semibold" style={{ color: C.steel, fontFamily: FONT_MONO }}>{fmtShort(a.ts)}</span>{" "}
                  <span style={{ color: C.inkSoft }}>· {a.user} —</span> {a.action}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
            <div className="px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: C.steelDark }}>
              <Bell size={15} color="#fff" />
              <span className="text-xs font-semibold text-white">Centro de notificaciones</span>
            </div>
            <div className="p-3 space-y-2 max-h-52 overflow-y-auto" style={{ backgroundColor: C.paperDark }}>
              {order.whatsapp_log.slice().reverse().map((w, i) => (
                <div key={i} className="bg-white rounded-lg px-2.5 py-2 text-[11px] shadow-sm max-w-[92%] ml-auto">
                  <p style={{ color: C.ink }}>{w.text}</p>
                  <p className="text-right text-[9px] mt-1" style={{ color: C.inkFaint }}>{fmtShort(w.ts)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {viewingStage && (
        <StageHistoryModal
          orderId={order.id}
          stage={viewingStage}
          stageData={order.stages[viewingStage.id]}
          onClose={() => setViewingStage(null)}
          onSaveEdit={(newData) => onEditStage(viewingStage.id, newData)}
        />
      )}
    </div>
  );
}
