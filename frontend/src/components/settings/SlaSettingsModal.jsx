import React, { useState } from "react";
import { X } from "lucide-react";
import { C, FONT_MONO } from "../../styles/tokens";
import { STAGES } from "../../constants/stages";

export default function SlaSettingsModal({ current, onClose, onSave }) {
  const [sla, setSla] = useState(current);
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(20,20,20,0.45)" }}>
      <div className="w-full max-w-md rounded-lg" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.line}` }}>
          <h3 className="text-sm font-bold" style={{ color: C.ink }}>Configuración global de SLA</h3>
          <button onClick={onClose}><X size={18} color={C.inkSoft} /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[11px]" style={{ color: C.inkSoft }}>
            Estos minutos aplican a todos los pedidos del sistema. Más adelante esto vivirá en un módulo de administración con permisos propios.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {STAGES.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 px-2.5 py-2 rounded" style={{ backgroundColor: C.paperDark }}>
                <span className="text-[11px]" style={{ color: C.inkSoft }}>{s.short}</span>
                <input type="number" min={1} value={sla[s.id]}
                  onChange={(e) => setSla({ ...sla, [s.id]: Number(e.target.value) || 1 })}
                  className="w-14 text-xs text-right px-1.5 py-1 rounded outline-none"
                  style={{ border: `1px solid ${C.line}`, fontFamily: FONT_MONO }} />
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 py-4 flex justify-end gap-2" style={{ borderTop: `1px solid ${C.line}` }}>
          <button onClick={onClose} className="px-4 py-2 rounded text-xs font-semibold" style={{ color: C.inkSoft }}>Cancelar</button>
          <button disabled={busy} onClick={async () => { setBusy(true); await onSave(sla); setBusy(false); }}
            className="px-4 py-2 rounded text-xs font-semibold text-white disabled:opacity-50" style={{ backgroundColor: C.steel }}>
            {busy ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
