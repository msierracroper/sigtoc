import React, { useState } from "react";
import { X } from "lucide-react";
import { C } from "../../styles/tokens";

/* ============ MODAL NUEVO PEDIDO ============ */
export default function NewOrderModal({ onClose, onCreate }) {
  const [cliente, setCliente] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(20,20,20,0.45)" }}>
      <div className="w-full max-w-md rounded-lg" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.line}` }}>
          <h3 className="text-sm font-bold" style={{ color: C.ink }}>Nuevo pedido</h3>
          <button onClick={onClose}><X size={18} color={C.inkSoft} /></button>
        </div>
        <div className="p-5 space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>Cliente / referencia</label>
          <input value={cliente} onChange={(e) => setCliente(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded outline-none" style={{ border: `1px solid ${C.line}` }}
            placeholder="Ej: Distribuidora Andina SAS" />
          <p className="text-[11px] pt-1" style={{ color: C.inkFaint }}>
            El SLA de cada etapa usa la configuración global del sistema.
          </p>
        </div>
        <div className="px-5 py-4 flex justify-end gap-2" style={{ borderTop: `1px solid ${C.line}` }}>
          <button onClick={onClose} className="px-4 py-2 rounded text-xs font-semibold" style={{ color: C.inkSoft }}>Cancelar</button>
          <button disabled={busy} onClick={async () => { setBusy(true); await onCreate(cliente); setBusy(false); }}
            className="px-4 py-2 rounded text-xs font-semibold text-white disabled:opacity-50" style={{ backgroundColor: C.steel }}>
            {busy ? "Creando..." : "Crear pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}
