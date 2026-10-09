import React, { useState } from "react";
import { Pencil } from "lucide-react";
import { fmtShort, shortUser } from "../../../utils/format";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import StageDataView from "./StageDataView";
import StageEditForm from "./StageEditForm";

export default function StageHistoryModal({ orderId, stage, stageData, onClose, onSaveEdit }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const history = stageData.editHistory || [];
  const version = history.length + 1;

  return (
    <Modal wide onClose={onClose} title={`Etapa ${stage.id} · ${stage.name}`}
      subtitle={`Completada ${fmtShort(stageData.completedAt)} · versión actual v${version}`}>
      <div className="space-y-5">
        {editing ? (
          <StageEditForm orderId={orderId} stageId={stage.id} data={stageData.data} busy={busy}
            onSave={async (newData) => { setBusy(true); await onSaveEdit(newData); setBusy(false); setEditing(false); }}
            onCancel={() => setEditing(false)} />
        ) : (
          <>
            <div className="rounded-xl p-3.5 shadow-[inset_0_0_0_1px_#E3E3E3]">
              <p className="text-[12px] font-semibold text-ink2 mb-1.5">Datos actuales · v{version}</p>
              <StageDataView stageId={stage.id} data={stageData.data} />
            </div>
            <Button icon={Pencil} onClick={() => setEditing(true)}>Corregir datos (crea v{version + 1})</Button>
          </>
        )}

        {history.length > 0 && (
          <div>
            <p className="text-[12px] font-semibold text-ink2 mb-2">Versiones anteriores</p>
            <ol className="space-y-2">
              {history.slice().reverse().map((h) => (
                <li key={h.version} className="rounded-xl p-3 bg-surface2">
                  <p className="text-[12px] text-ink2 mb-1.5 num">v{h.version} · reemplazada por {shortUser(h.editedBy)} el {fmtShort(h.editedAt)}</p>
                  <StageDataView stageId={stage.id} data={h.data} />
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Modal>
  );
}
