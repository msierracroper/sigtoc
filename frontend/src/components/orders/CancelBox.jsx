import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { C } from "../../styles/tokens";

export default function CancelBox({ onCancel }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-[11px] font-semibold mt-4" style={{ color: C.inkFaint }}>
        ¿No se puede continuar con este pedido? Finalizar por anomalía
      </button>
    );
  }
  return (
    <div className="mt-4 p-3 rounded" style={{ backgroundColor: C.alertBg, border: `1px solid ${C.alert}` }}>
      <p className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5 mb-2" style={{ color: C.alert }}>
        <AlertTriangle size={13} /> Finalizar pedido por anomalía
      </p>
      <textarea
        value={reason} onChange={(e) => setReason(e.target.value)}
        placeholder="Describe el motivo (ej: cliente canceló, mercancía no disponible, error en el pedido...)"
        className="w-full text-xs px-3 py-2 rounded outline-none" rows={2}
        style={{ border: `1px solid ${C.line}` }}
      />
      <div className="flex gap-2 mt-2">
        <button
          disabled={!reason.trim() || busy}
          onClick={async () => { setBusy(true); await onCancel(reason.trim()); setBusy(false); }}
          className="px-4 py-2 rounded text-xs font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: C.alert }}
        >
          {busy ? "Registrando..." : "Confirmar y cerrar pedido"}
        </button>
        <button onClick={() => { setOpen(false); setReason(""); }} className="px-4 py-2 rounded text-xs font-semibold" style={{ color: C.inkSoft }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
