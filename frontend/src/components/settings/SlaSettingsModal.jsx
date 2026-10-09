import React, { useState } from "react";
import { STAGES } from "../../constants/stages";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

export default function SlaSettingsModal({ current, onClose, onSave }) {
  const [sla, setSla] = useState(() => Object.fromEntries(STAGES.map((s) => [s.id, String(current[s.id] ?? "")])));
  const [busy, setBusy] = useState(false);
  const invalid = STAGES.filter((s) => !(Number(sla[s.id]) >= 1));

  async function save() {
    if (invalid.length) return;
    setBusy(true);
    await onSave(Object.fromEntries(STAGES.map((s) => [s.id, Math.round(Number(sla[s.id]))])));
    setBusy(false);
  }

  return (
    <Modal title="Configuración de SLA" subtitle="Minutos máximos por etapa. Aplica a todos los pedidos abiertos." onClose={onClose}
      footer={<>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="primary" onClick={save} disabled={invalid.length > 0} busy={busy}>Guardar</Button>
      </>}>
      <div className="space-y-2">
        {STAGES.map((s) => {
          const bad = !(Number(sla[s.id]) >= 1);
          return (
            <div key={s.id} className="flex items-center gap-3">
              <label htmlFor={`sla-${s.id}`} className="flex-1">
                <span className="font-semibold">{s.short}</span>
                <span className="block text-[12.5px] text-ink2">Alerta “por vencer” a los {bad ? "—" : Math.round(Number(sla[s.id]) * 0.75)} min</span>
              </label>
              <div className="relative w-28">
                <input id={`sla-${s.id}`} type="number" inputMode="numeric" min={1} value={sla[s.id]}
                  onChange={(e) => setSla({ ...sla, [s.id]: e.target.value })}
                  aria-invalid={bad} className={`field pr-11 text-right num ${bad ? "!shadow-[inset_0_0_0_2px_#E51C00]" : ""}`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink2 text-[13px] pointer-events-none">min</span>
              </div>
            </div>
          );
        })}
        {invalid.length > 0 && <p className="text-[12.5px] text-crit pt-1" role="alert">Cada etapa necesita al menos 1 minuto.</p>}
        <p className="text-[12.5px] text-ink2 pt-2">Los reportes históricos usan el límite vigente cuando se creó cada pedido.</p>
      </div>
    </Modal>
  );
}
