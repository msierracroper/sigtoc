import React, { useState } from "react";
import { X } from "lucide-react";
import { C } from "../../../styles/tokens";
import { fmtShort } from "../../../utils/format";
import StageDataView from "./StageDataView";
import StageEditForm from "./StageEditForm";

export default function StageHistoryModal({ orderId, stage, stageData, onClose, onSaveEdit }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const history = stageData.editHistory || [];
  const version = history.length + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(20,20,20,0.45)" }}>
      <div className="w-full max-w-lg rounded-lg max-h-[85vh] overflow-y-auto" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.line}` }}>
          <div>
            <h3 className="text-sm font-bold" style={{ color: C.ink }}>Etapa {stage.id} · {stage.name}</h3>
            <p className="text-[11px] mt-0.5" style={{ color: C.inkFaint }}>
              Completada {fmtShort(stageData.completedAt)} · versión actual: v{version}
            </p>
          </div>
          <button onClick={onClose}><X size={18} color={C.inkSoft} /></button>
        </div>

        <div className="p-5 space-y-4">
          {editing ? (
            <StageEditForm orderId={orderId} stageId={stage.id} data={stageData.data}
              onSave={async (newData) => { setBusy(true); await onSaveEdit(newData); setBusy(false); setEditing(false); }}
              onCancel={() => setEditing(false)} />
          ) : (
            <>
              <div className="p-3 rounded" style={{ backgroundColor: C.paperDark }}>
                <p className="text-[10px] font-bold uppercase mb-1.5" style={{ color: C.inkSoft }}>Datos actuales (v{version})</p>
                <StageDataView stageId={stage.id} data={stageData.data} />
              </div>
              <button onClick={() => setEditing(true)} className="px-4 py-2 rounded text-xs font-bold text-white" style={{ backgroundColor: C.steel }}>
                Editar y crear nueva versión
              </button>
            </>
          )}

          {history.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase mb-2" style={{ color: C.inkSoft }}>Historial de versiones anteriores</p>
              <div className="space-y-2">
                {history.slice().reverse().map((h) => (
                  <div key={h.version} className="p-2.5 rounded" style={{ backgroundColor: C.paperDark, border: `1px solid ${C.line}` }}>
                    <p className="text-[10px] font-semibold mb-1" style={{ color: C.inkFaint }}>
                      v{h.version} · reemplazada por {h.editedBy} el {fmtShort(h.editedAt)}
                    </p>
                    <StageDataView stageId={stage.id} data={h.data} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
