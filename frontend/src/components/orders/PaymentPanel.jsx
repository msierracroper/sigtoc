import React, { useState } from "react";
import { CreditCard } from "lucide-react";
import { uploadPaymentProof } from "../../services/storage";
import { fmtShort, shortUser } from "../../utils/format";
import Badge from "../ui/Badge";
import FileSlot from "../documents/FileSlot";
import SwitchRow from "../ui/SwitchRow";

// Pago del pedido: se puede confirmar en cualquier etapa (y desmarcar); cada cambio queda en la auditoría.
export default function PaymentPanel({ order, onSetPaid, onSetProof, readOnly, embedded }) {
  const payment = order.payment || {};
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function toggle(checked) {
    setBusy(true);
    await onSetPaid(checked);
    setBusy(false);
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true); setError("");
    const { path, error: err } = await uploadPaymentProof(order.id, file);
    if (err) { setUploading(false); setError("No se pudo subir el comprobante. Revisa tu conexión e inténtalo de nuevo."); return; }
    await onSetProof(path);
    setUploading(false);
  }

  return (
    <div className={embedded ? "space-y-3" : "card p-4 space-y-3"}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold"><CreditCard size={16} className="text-ink2" /> Pago</h3>
        {payment.paid ? <Badge tone="success">Pagado</Badge> : <Badge tone="neutral">Pendiente</Badge>}
      </div>

      <SwitchRow label="El pedido ya está pagado" checked={payment.paid} onChange={toggle} disabled={busy || readOnly} tone="ok" />
      {payment.paid && payment.paidBy && (
        <p className="text-[12.5px] text-ink2 -mt-1 num">Confirmado por {shortUser(payment.paidBy)} · {fmtShort(payment.paidAt)}</p>
      )}

      {readOnly && !payment.proofPath ? null : (
        <FileSlot label="Comprobante de pago" hint="Foto o PDF (opcional)" accept="application/pdf,image/*"
          uploadedPath={payment.proofPath} busy={uploading} error={error} onFile={readOnly ? undefined : handleFile}
          onRemove={readOnly ? undefined : () => onSetProof(null)} />
      )}
      {!embedded && <p className="text-[12.5px] text-ink2">Opcional: puede confirmarse en cualquier etapa.</p>}
    </div>
  );
}
