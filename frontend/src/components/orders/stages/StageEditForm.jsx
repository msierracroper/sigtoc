import React, { useState } from "react";
import { C } from "../../../styles/tokens";
import PdfUploader from "../../documents/PdfUploader";
import GuideUploader from "../../documents/GuideUploader";
import SerialListEditor from "./SerialListEditor";

export default function StageEditForm({ orderId, stageId, data, onSave, onCancel }) {
  const [pdfPath, setPdfPath] = useState(data?.pdfPath || null);
  const [rutPath, setRutPath] = useState(data?.rutPath || null);
  const [serialesList, setSerialesList] = useState(
    data?.serialesList?.length ? data.serialesList : (data?.seriales && data.seriales !== "Sin serial" ? data.seriales.split(",").map((s) => s.trim()).filter(Boolean) : [""])
  );
  const [factura, setFactura] = useState(data?.factura || "");
  const [modo, setModo] = useState(data?.modo || "guia");
  const [guiaNumero, setGuiaNumero] = useState(data?.guiaNumero || "");
  const [guiaFilePath, setGuiaFilePath] = useState(data?.guiaFilePath || null);
  const inputStyle = { border: `1px solid ${C.line}` };

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
        <div className="grid grid-cols-2 gap-3">
          <PdfUploader orderId={orderId} kind="pedido" label="PDF del pedido" uploadedPath={pdfPath} onUploaded={setPdfPath} />
          <PdfUploader orderId={orderId} kind="rut" label="RUT (opcional)" uploadedPath={rutPath} onUploaded={setRutPath} />
        </div>
      )}
      {stageId === 2 && <SerialListEditor list={serialesList} setList={setSerialesList} disabled={false} />}
      {stageId === 3 && (
        <input value={factura} onChange={(e) => setFactura(e.target.value)} placeholder="Número de factura"
          className="w-full text-xs px-3 py-2.5 rounded outline-none" style={inputStyle} />
      )}
      {stageId === 4 && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label onClick={() => setModo("guia")} className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-xs"
              style={{ backgroundColor: modo === "guia" ? C.steelSoft : C.paperDark }}>Envío con guía</label>
            <label onClick={() => setModo("tienda")} className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-xs"
              style={{ backgroundColor: modo === "tienda" ? C.steelSoft : C.paperDark }}>Entrega en tienda</label>
          </div>
          {modo === "guia" && (
            <>
              <input value={guiaNumero} onChange={(e) => setGuiaNumero(e.target.value)} placeholder="Número de guía (opcional si subes el archivo)"
                className="w-full text-xs px-3 py-2.5 rounded outline-none" style={inputStyle} />
              <GuideUploader orderId={orderId} label="Foto o PDF de la guía (opcional si escribes el número)" uploadedPath={guiaFilePath} onUploaded={setGuiaFilePath} />
            </>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={save} className="px-4 py-2 rounded text-xs font-bold text-white" style={{ backgroundColor: C.steel }}>Guardar nueva versión</button>
        <button onClick={onCancel} className="px-4 py-2 rounded text-xs font-semibold" style={{ color: C.inkSoft }}>Cancelar</button>
      </div>
    </div>
  );
}
