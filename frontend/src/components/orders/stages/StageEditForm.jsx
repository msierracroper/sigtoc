import React, { useState } from "react";
import Button from "../../ui/Button";
import PdfUploader from "../../documents/PdfUploader";
import GuideUploader from "../../documents/GuideUploader";
import SerialListEditor from "./SerialListEditor";
import { DeliveryModePicker } from "./StageForm";

export default function StageEditForm({ orderId, stageId, data, onSave, onCancel, busy }) {
  const [pdfPath, setPdfPath] = useState(data?.pdfPath || null);
  const [rutPath, setRutPath] = useState(data?.rutPath || null);
  const [serialesList, setSerialesList] = useState(
    data?.serialesList?.length ? data.serialesList : (data?.seriales && data.seriales !== "Sin serial" ? data.seriales.split(",").map((s) => s.trim()).filter(Boolean) : [""])
  );
  const [factura, setFactura] = useState(data?.factura || "");
  const [modo, setModo] = useState(data?.modo || "guia");
  const [guiaNumero, setGuiaNumero] = useState(data?.guiaNumero || "");
  const [guiaFilePath, setGuiaFilePath] = useState(data?.guiaFilePath || null);

  function save() {
    if (stageId === 1) onSave({ pdfPath, rutPath });
    else if (stageId === 2) {
      const clean = serialesList.map((s) => s.trim()).filter(Boolean);
      onSave({ serialesList: clean, seriales: clean.length ? clean.join(", ") : "Sin serial" });
    }
    else if (stageId === 3) onSave({ factura });
    else onSave({ modo, guiaNumero: guiaNumero.trim() || null, guiaFilePath });
  }

  return (
    <div className="space-y-3">
      {stageId === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PdfUploader orderId={orderId} kind="pedido" label="PDF del pedido" uploadedPath={pdfPath} onUploaded={setPdfPath} />
          <PdfUploader orderId={orderId} kind="rut" label="RUT (opcional)" uploadedPath={rutPath} onUploaded={setRutPath} />
        </div>
      )}
      {stageId === 2 && <SerialListEditor list={serialesList} setList={setSerialesList} disabled={false} />}
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
