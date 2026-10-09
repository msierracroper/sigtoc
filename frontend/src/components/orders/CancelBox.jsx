import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "../ui/Button";

// "Finalizar por anomalía": aislada del botón de avanzar etapa y con motivo obligatorio.
export default function CancelBox({ onCancel }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <div className="mt-8 pt-4 border-t border-line2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-ink2">¿No se puede continuar con este pedido?</p>
        <Button variant="criticalOutline" size="sm" onClick={() => setOpen(true)} className="h-10 sm:h-8">Finalizar por anomalía</Button>
      </div>
    );
  }
  return (
    <div className="mt-8 p-4 rounded-xl bg-[#FFF4F4] shadow-[inset_0_0_0_1px_#FECDCA]">
      <p className="font-semibold text-crit flex items-center gap-1.5 mb-1"><AlertTriangle size={16} /> Finalizar pedido por anomalía</p>
      <p className="text-[13px] text-[#5C1B12] mb-3">El pedido se cierra y no admite más etapas. El motivo queda en la auditoría.</p>
      <label className="label" htmlFor="cancel-reason">Motivo</label>
      <textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} autoFocus
        placeholder="Ej: el cliente canceló, mercancía no disponible, error en el pedido…"
        className="field h-auto py-2 resize-none" />
      <div className="flex flex-wrap gap-2 mt-3">
        <Button variant="critical" disabled={!reason.trim()} busy={busy}
          onClick={async () => { setBusy(true); await onCancel(reason.trim()); setBusy(false); }}>
          Confirmar y cerrar pedido
        </Button>
        <Button onClick={() => { setOpen(false); setReason(""); }}>Volver</Button>
      </div>
    </div>
  );
}
