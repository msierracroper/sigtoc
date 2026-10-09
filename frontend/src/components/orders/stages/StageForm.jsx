import React, { useState } from "react";
import { Truck, MapPin } from "lucide-react";
import { C } from "../../../styles/tokens";
import PdfUploader from "../../documents/PdfUploader";
import GuideUploader from "../../documents/GuideUploader";
import SerialListEditor from "./SerialListEditor";

export default function StageForm({ orderId, stageId, onFinalize }) {
  const [pdfPath, setPdfPath] = useState(null);
  const [rutPath, setRutPath] = useState(null);
  const [serialesList, setSerialesList] = useState([""]);
  const [sinSerial, setSinSerial] = useState(false);
  const [factura, setFactura] = useState("");
  const [modoEntrega, setModoEntrega] = useState("guia");
  const [guiaNumero, setGuiaNumero] = useState("");
  const [guiaFilePath, setGuiaFilePath] = useState(null);
  const inputStyle = { border: `1px solid ${C.line}` };
  const hasSerial = serialesList.some((s) => s.trim());

  if (stageId === 1) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <PdfUploader orderId={orderId} kind="pedido" label="PDF del pedido *" uploadedPath={pdfPath} onUploaded={setPdfPath} />
          <PdfUploader orderId={orderId} kind="rut" label="RUT (opcional)" uploadedPath={rutPath} onUploaded={setRutPath} />
        </div>
        <button disabled={!pdfPath} onClick={() => onFinalize({ pdfPath, rutPath: rutPath || null })}
          className="px-5 py-2.5 rounded text-xs font-bold text-white disabled:opacity-40" style={{ backgroundColor: C.steel }}>
          Finalizar etapa 1
        </button>
      </div>
    );
  }
  if (stageId === 2) {
    return (
      <div className="space-y-3">
        <SerialListEditor list={serialesList} setList={setSerialesList} disabled={sinSerial} />
        <label className="flex items-center gap-2 text-xs" style={{ color: C.inkSoft }}>
          <input type="checkbox" checked={sinSerial} onChange={(e) => setSinSerial(e.target.checked)} />
          Opción sin serial
        </label>
        <button disabled={!hasSerial && !sinSerial}
          onClick={() => {
            const clean = serialesList.map((s) => s.trim()).filter(Boolean);
            onFinalize({ serialesList: sinSerial ? [] : clean, seriales: sinSerial ? "Sin serial" : clean.join(", ") });
          }}
          className="px-5 py-2.5 rounded text-xs font-bold text-white disabled:opacity-40" style={{ backgroundColor: C.steel }}>
          Finalizar etapa 2
        </button>
      </div>
    );
  }
  if (stageId === 3) {
    return (
      <div className="space-y-3">
        <input value={factura} onChange={(e) => setFactura(e.target.value)} placeholder="Ej: FE-2026-9041"
          className="w-full text-xs px-3 py-2.5 rounded outline-none" style={inputStyle} />
        <button disabled={!factura} onClick={() => onFinalize({ factura })}
          className="px-5 py-2.5 rounded text-xs font-bold text-white disabled:opacity-40" style={{ backgroundColor: C.steel }}>
          Finalizar etapa 3
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label onClick={() => setModoEntrega("guia")} className="flex items-center gap-2 px-3 py-3 rounded cursor-pointer"
          style={{ backgroundColor: modoEntrega === "guia" ? C.steelSoft : C.paperDark, border: modoEntrega === "guia" ? `1px solid ${C.steel}` : "1px solid transparent" }}>
          <Truck size={14} color={C.steel} /><span className="text-xs font-medium">Envío con guía</span>
        </label>
        <label onClick={() => setModoEntrega("tienda")} className="flex items-center gap-2 px-3 py-3 rounded cursor-pointer"
          style={{ backgroundColor: modoEntrega === "tienda" ? C.steelSoft : C.paperDark, border: modoEntrega === "tienda" ? `1px solid ${C.steel}` : "1px solid transparent" }}>
          <MapPin size={14} color={C.steel} /><span className="text-xs font-medium">Entrega en tienda</span>
        </label>
      </div>
      {modoEntrega === "guia" && (
        <div className="space-y-2">
          <input value={guiaNumero} onChange={(e) => setGuiaNumero(e.target.value)} placeholder="Número de guía (opcional si subes el archivo)"
            className="w-full text-xs px-3 py-2.5 rounded outline-none" style={inputStyle} />
          <GuideUploader orderId={orderId} label="Foto o PDF de la guía (opcional si escribes el número)" uploadedPath={guiaFilePath} onUploaded={setGuiaFilePath} />
        </div>
      )}
      <button
        disabled={modoEntrega === "guia" && !guiaNumero.trim() && !guiaFilePath}
        onClick={() => onFinalize({ modo: modoEntrega, guiaNumero: guiaNumero.trim() || null, guiaFilePath })}
        className="px-5 py-2.5 rounded text-xs font-bold text-white disabled:opacity-40" style={{ backgroundColor: C.ok }}>
        Pedido finalizado
      </button>
    </div>
  );
}
