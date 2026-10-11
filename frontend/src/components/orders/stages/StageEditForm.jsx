import React, { useState } from "react";
import Button from "../../ui/Button";
import PdfUploader from "../../documents/PdfUploader";
import GuideUploader from "../../documents/GuideUploader";
import SerialListEditor from "./SerialListEditor";
import { DeliveryModePicker, OriginSelect, CarrierSelect } from "./StageForm";
import { emptyItem, itemsFromData, stageDataFromItems } from "../../../utils/items";

export default function StageEditForm({ orderId, stageId, data, onSave, onCancel, busy, origins, carriers }) {
  const [transportadora, setTransportadora] = useState(data?.transportadora || "");
  const [origen, setOrigen] = useState(data?.origen || "");
  const [pdfPath, setPdfPath] = useState(data?.pdfPath || null);
  const [rutPath, setRutPath] = useState(data?.rutPath || null);
  const [items, setItems] = useState(() => { const it = itemsFromData(data); return it.length ? it : [emptyItem()]; });
  const [factura, setFactura] = useState(data?.factura || "");
  const [modo, setModo] = useState(data?.modo || "guia");
  const [guiaNumero, setGuiaNumero] = useState(data?.guiaNumero || "");
  const [guiaFilePath, setGuiaFilePath] = useState(data?.guiaFilePath || null);

  function save() {
    if (stageId === 1) onSave({ ...data, pdfPath, rutPath, origen: origen || null });
    else if (stageId === 2) {
      onSave(stageDataFromItems(items, false));
    }
    else if (stageId === 3) onSave({ factura });
    else onSave({ ...data, modo, transportadora: modo === "guia" ? transportadora || null : null, guiaNumero: guiaNumero.trim() || null, guiaFilePath });
  }

  return (
    <div className="space-y-3">
      {stageId === 1 && <OriginSelect value={origen} onChange={setOrigen} origins={origins} />}
      {stageId === 1 && data?.preventa && <p className="text-[12.5px] text-ink2">Pedido de preventa (no se puede cambiar después de finalizar Ingreso).</p>}
      {stageId === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PdfUploader orderId={orderId} kind="pedido" label="PDF del pedido" uploadedPath={pdfPath} onUploaded={setPdfPath} />
          <PdfUploader orderId={orderId} kind="rut" label="RUT (opcional)" uploadedPath={rutPath} onUploaded={setRutPath} />
        </div>
      )}
      {stageId === 2 && <SerialListEditor items={items} setItems={setItems} disabled={false} />}
      {stageId === 3 && (
        <div>
          <label className="label" htmlFor="factura-edit">Número de factura</label>
          <input id="factura-edit" value={factura} onChange={(e) => setFactura(e.target.value)} className="field" />
        </div>
      )}
      {stageId === 4 && (
        <div className="space-y-3">
          <DeliveryModePicker value={modo} onChange={setModo} />
          {modo === "guia" && (
            <>
              <CarrierSelect value={transportadora} onChange={setTransportadora} carriers={carriers} />
              <div>
                <label className="label" htmlFor="guia-edit">Número de guía</label>
                <input id="guia-edit" value={guiaNumero} onChange={(e) => setGuiaNumero(e.target.value)} className="field" />
              </div>
              <GuideUploader orderId={orderId} label="Foto o PDF de la guía" uploadedPath={guiaFilePath} onUploaded={setGuiaFilePath} />
            </>
          )}
        </div>
      )}
      <p className="text-[12.5px] text-ink2">Los datos actuales se conservan como versión anterior en el historial.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={save} busy={busy}>Guardar nueva versión</Button>
        <Button onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}
