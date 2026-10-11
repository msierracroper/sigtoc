import React, { useState } from "react";
import { AlertTriangle, PauseCircle } from "lucide-react";
import Button from "../ui/Button";

// "¿No se puede continuar?": poner en stand by (pausa recuperable) o finalizar por anomalía (cierre definitivo).
// Aisladas del botón de avanzar etapa y ambas con motivo obligatorio.
const MODES = {
  pause: {
    title: "Poner pedido en stand by",
    icon: PauseCircle,
    box: "bg-[#F2F8FF] shadow-[inset_0_0_0_1px_#C3DDFB]",
    titleCls: "text-info",
    note: "El SLA de la etapa queda congelado y el pedido se detiene hasta que lo reanudes. El motivo queda en la auditoría.",
    noteCls: "text-info",
    placeholder: "Ej: esperando respuesta del cliente, falta un producto, pago en verificación…",
    confirm: "Poner en stand by",
    confirmVariant: "primary",
  },
  cancel: {
    title: "Finalizar pedido por anomalía",
    icon: AlertTriangle,
    box: "bg-[#FFF4F4] shadow-[inset_0_0_0_1px_#FECDCA]",
    titleCls: "text-crit",
    note: "El pedido se cierra y no admite más etapas. El motivo queda en la auditoría.",
    noteCls: "text-[#5C1B12]",
    placeholder: "Ej: el cliente canceló, mercancía no disponible, error en el pedido…",
    confirm: "Confirmar y cerrar pedido",
    confirmVariant: "critical",
  },
};

export default function IssueActions({ onPause, onCancel, canPause = true }) {
  const [mode, setMode] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!mode) {
    return (
      <div className="mt-8 pt-4 border-t border-line2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-ink2">¿No se puede continuar con este pedido?</p>
        <div className="flex flex-wrap gap-2">
          {canPause && <Button size="sm" icon={PauseCircle} onClick={() => setMode("pause")} className="h-10 sm:h-8">Poner en stand by</Button>}
          <Button variant="criticalOutline" size="sm" onClick={() => setMode("cancel")} className="h-10 sm:h-8">Finalizar por anomalía</Button>
        </div>
      </div>
    );
  }

  const m = MODES[mode];
  const Icon = m.icon;
  async function confirm() {
    setBusy(true);
    await (mode === "pause" ? onPause : onCancel)(reason.trim());
    setBusy(false);
    setMode(null); setReason("");
  }

  return (
    <div className={`mt-8 p-4 rounded-xl ${m.box}`}>
      <p className={`font-semibold flex items-center gap-1.5 mb-1 ${m.titleCls}`}><Icon size={16} /> {m.title}</p>
      <p className={`text-[13px] mb-3 ${m.noteCls}`}>{m.note}</p>
      <label className="label" htmlFor="issue-reason">Motivo</label>
      <textarea id="issue-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} autoFocus
        placeholder={m.placeholder} className="field h-auto py-2 resize-none" />
      <div className="flex flex-wrap gap-2 mt-3">
        <Button variant={m.confirmVariant} disabled={!reason.trim()} busy={busy} onClick={confirm}>{m.confirm}</Button>
        <Button onClick={() => { setMode(null); setReason(""); }}>Volver</Button>
      </div>
    </div>
  );
}
