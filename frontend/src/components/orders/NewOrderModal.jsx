import React, { useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

export default function NewOrderModal({ onClose, onCreate }) {
  const [cliente, setCliente] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e?.preventDefault();
    if (!cliente.trim()) return;
    setBusy(true);
    await onCreate(cliente.trim());
    setBusy(false);
  }

  return (
    <Modal title="Crear pedido" onClose={onClose}
      footer={<>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="primary" onClick={submit} disabled={!cliente.trim()} busy={busy}>Crear pedido</Button>
      </>}>
      <form onSubmit={submit}>
        <label className="label" htmlFor="cliente">Cliente o referencia</label>
        <input id="cliente" autoFocus value={cliente} onChange={(e) => setCliente(e.target.value)} className="field" placeholder="Ej: Distribuidora Andina SAS" />
        <p className="text-[12.5px] text-ink2 mt-2">El pedido empieza en Ingreso y su SLA corre desde ahora, con los límites de la configuración global.</p>
      </form>
    </Modal>
  );
}
