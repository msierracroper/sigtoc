import React, { useState } from "react";
import { ChevronLeft, CheckCircle2, AlertTriangle, ClipboardList, Bell } from "lucide-react";
import { STAGES } from "../../constants/stages";
import { fmtShort, fmtMinutes, fmtElapsed, shortUser } from "../../utils/format";
import { slaStatus } from "../../utils/sla";
import { OrderStatusBadge } from "../ui/Badge";
import Button from "../ui/Button";
import Banner from "../ui/Banner";
import { SlaMeter } from "../ui/Meter";
import CancelBox from "./CancelBox";
import StageForm from "./stages/StageForm";
import StageHistoryModal from "./stages/StageHistoryModal";

function Stepper({ order, sla, onView }) {
  return (
    <ol className="card px-3 sm:px-5 py-4 flex items-start">
      {STAGES.map((s, idx) => {
        const stg = order.stages[s.id] || {};
        const done = !!stg.completedAt;
        const active = order.status === "abierto" && order.current_stage === s.id;
        const versions = (stg.editHistory?.length || 0) + 1;
        const ring = done ? "bg-okBg text-ok" : active
          ? sla?.state === "excedido" ? "bg-critBg text-crit ring-2 ring-critBar" : sla?.state === "alerta" ? "bg-warnBg text-warn ring-2 ring-warnBar" : "bg-infoBg text-info ring-2 ring-link"
          : "bg-surface2 text-ink3";
        return (
          <li key={s.id} className="relative flex-1 flex items-start">
            {idx < STAGES.length - 1 && <span className={`absolute top-[22px] left-[calc(50%+24px)] right-[calc(-50%+24px)] h-0.5 rounded ${done ? "bg-okBar" : "bg-line2"}`} aria-hidden="true" />}
            <button disabled={!done} onClick={() => onView(s)}
              className={`flex-1 flex flex-col items-center gap-1.5 text-center rounded-lg py-1 ${done ? "hover:bg-surface2 cursor-pointer" : "cursor-default"}`}
              aria-label={done ? `Ver o editar ${s.name}` : s.name}>
              <span className={`relative w-9 h-9 rounded-full grid place-items-center ${ring}`}>
                {done ? <CheckCircle2 size={18} /> : <s.icon size={17} />}
                {done && versions > 1 && <span className="absolute -top-1.5 -right-2 h-4 px-1 rounded-full bg-ink text-white text-[10px] font-semibold grid place-items-center">v{versions}</span>}
              </span>
              <span className={`text-[12.5px] font-semibold leading-tight ${done || active ? "text-ink" : "text-ink3"}`}>{s.short}</span>
              {done
                ? <span className="mt-0.5 h-7 sm:h-6 px-2 rounded-md inline-flex items-center text-[12px] sm:text-[11.5px] font-semibold text-ink bg-surface shadow-[inset_0_0_0_1px_#E3E3E3,0_1px_0_rgba(0,0,0,.05)]">Ver detalle</span>
                : <span className="text-[11.5px] leading-tight text-ink3">{active ? "En curso" : "Pendiente"}</span>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default function OrderDetail({ order, now, slaSettings, onBack, onFinalizeStage, onCancelOrder, onEditStage }) {
  const [viewingStage, setViewingStage] = useState(null);
  const sla = slaStatus(order, slaSettings, now);
  const stage = STAGES[order.current_stage - 1];

  return (
    <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      <Button size="sm" icon={ChevronLeft} onClick={onBack} aria-label="Volver a pedidos">Pedidos</Button>

      <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
        <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight num">{order.id}</h1>
        <div className="mt-1"><OrderStatusBadge order={order} sla={sla} /></div>
        <p className="w-full text-ink2 text-[14px]">{order.cliente} · creado {fmtShort(order.created_at)} por {shortUser(order.created_by_email)}</p>
      </div>

      {order.status === "cancelado" && order.cancel_info && (
        <Banner tone="warning">
          <b className="font-semibold">Pedido finalizado por anomalía en {stage.name}.</b> {order.cancel_info.reason}
          <span className="block text-[12.5px] mt-0.5 opacity-80">Registrado por {shortUser(order.cancel_info.by)} · {fmtShort(order.cancel_info.at)}</span>
        </Banner>
      )}

      <Stepper order={order} sla={sla} onView={setViewingStage} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <section className="lg:col-span-7 card">
          {order.status === "cerrado" ? (
            <div className="text-center py-10 px-6">
              <CheckCircle2 size={30} className="mx-auto mb-2 text-okBar" />
              <p className="text-[15px] font-semibold">Pedido entregado</p>
              <p className="text-ink2 mt-1">Las 4 etapas quedaron registradas en la auditoría. Selecciona una etapa para ver o corregir sus datos.</p>
            </div>
          ) : order.status === "cancelado" ? (
            <div className="text-center py-10 px-6">
              <AlertTriangle size={30} className="mx-auto mb-2 text-warnBar" />
              <p className="text-[15px] font-semibold">Pedido detenido</p>
              <p className="text-ink2 mt-1">No admite más etapas. El motivo quedó registrado arriba y en la auditoría.</p>
            </div>
          ) : (
            <>
              <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-4 border-b border-line2">
                <h2 className="text-[16px] font-semibold">Etapa {order.current_stage} · {stage.name}</h2>
                <p className="text-ink2 mt-0.5">{stage.desc}</p>
                {sla && (
                  <div className="mt-3 num">
                    <div className="flex justify-between text-[13.5px] mb-1.5">
                      <span className="text-ink2"><b className={`font-semibold ${sla.state === "excedido" ? "text-crit" : "text-ink"}`}>{fmtElapsed(sla.elapsedMin)}</b> de {sla.limitMin} min en la etapa</span>
                      <span className={`font-semibold ${sla.state === "excedido" ? "text-crit" : sla.state === "alerta" ? "text-warn" : "text-ok"}`}>
                        {sla.state === "excedido" ? `Excedido por ${fmtMinutes(-sla.remainingMin)}` : `Quedan ${fmtMinutes(sla.remainingMin)}`}
                      </span>
                    </div>
                    <SlaMeter sla={sla} className="h-2" />
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-5">
                <StageForm key={`${order.id}-${order.current_stage}`} orderId={order.id} stageId={order.current_stage}
                  onFinalize={(data) => onFinalizeStage(order.current_stage, data)} />
                <CancelBox onCancel={onCancelOrder} />
              </div>
            </>
          )}
        </section>

        <aside className="lg:col-span-5 space-y-4">
          <div className="card">
            <h3 className="flex items-center gap-2 px-4 pt-4 pb-2 font-semibold"><ClipboardList size={16} className="text-ink2" /> Registro de auditoría</h3>
            <ol className="px-4 pb-3 max-h-64 overflow-y-auto">
              {order.audit_log.slice().reverse().map((a, i) => (
                <li key={i} className="py-2 border-b border-line2 last:border-0 text-[13px]">
                  <p>{a.action}</p>
                  <p className="text-[12px] text-ink2 mt-0.5 num">{fmtShort(a.ts)} · {shortUser(a.user)}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="card">
            <h3 className="flex items-center gap-2 px-4 pt-4 pb-2 font-semibold"><Bell size={16} className="text-ink2" /> Centro de notificaciones</h3>
            <ol className="px-4 pb-3 max-h-64 overflow-y-auto">
              {order.whatsapp_log.slice().reverse().map((w, i) => (
                <li key={i} className="py-2 border-b border-line2 last:border-0 text-[13px]">
                  <p>{w.text}</p>
                  <p className="text-[12px] text-ink2 mt-0.5 num">{fmtShort(w.ts)}</p>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      {viewingStage && (
        <StageHistoryModal orderId={order.id} stage={viewingStage} stageData={order.stages[viewingStage.id]}
          onClose={() => setViewingStage(null)} onSaveEdit={(newData) => onEditStage(viewingStage.id, newData)} />
      )}
    </div>
  );
}
