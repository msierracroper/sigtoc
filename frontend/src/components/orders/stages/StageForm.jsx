import React, { useState } from "react";
import { Truck, Store, ArrowRight } from "lucide-react";
import { STAGES } from "../../../constants/stages";
import Button from "../../ui/Button";
import PdfUploader from "../../documents/PdfUploader";
import GuideUploader from "../../documents/GuideUploader";
import SerialListEditor from "./SerialListEditor";

// Selector de modo de entrega (radio accesible con apariencia de tarjeta)
export function DeliveryModePicker({ value, onChange }) {
  const opts = [
    { id: "guia", label: "Envío con guía", icon: Truck },
    { id: "tienda", label: "Entrega en tienda", icon: Store },
  ];
  return (
    <div role="radiogroup" aria-label="Modo de entrega" className="grid grid-cols-2 gap-2">
      {opts.map((o) => {
        const on = value === o.id;
        return (
          <button key={o.id} role="radio" aria-checked={on} onClick={() => onChange(o.id)}
            className={`h-12 sm:h-11 rounded-xl flex items-center gap-2 px-3 font-semibold transition-shadow ${on ? "bg-infoBg text-info shadow-[inset_0_0_0_2px_#005BD3]" : "bg-surface text-ink shadow-[inset_0_0_0_1px_#E3E3E3] hover:bg-surface2"}`}>
            <o.icon size={17} /> {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Barra de acción: fija abajo en el celular (al alcance del pulgar), normal en escritorio
function ActionBar({ children, hint }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] bg-surface border-t border-line2 sm:static sm:mx-0 sm:px-0 sm:pb-0 sm:border-0 sm:bg-transparent mt-5">
      {children}
      {hint && <p className="text-[12.5px] text-ink2 mt-2">{hint}</p>}
    </div>
  );
}

export default function StageForm({ orderId, stageId, onFinalize }) {
  const [pdfPath, setPdfPath] = useState(null);
  const [rutPath, setRutPath] = useState(null);
  const [serialesList, setSerialesList] = useState([""]);
  const [sinSerial, setSinSerial] = useState(false);
  const [factura, setFactura] = useState("");
  const [modoEntrega, setModoEntrega] = useState("guia");
  const [guiaNumero, setGuiaNumero] = useState("");
  const [guiaFilePath, setGuiaFilePath] = useState(null);
  const [busy, setBusy] = useState(false);
  const hasSerial = serialesList.some((s) => s.trim());
  const next = STAGES[stageId]; // etapa siguiente (undefined en la 4)

  async function finalize(data) {
    setBusy(true);
    try { await onFinalize(data); } finally { setBusy(false); }
  }

  const finishLabel = next ? <>Finalizar {STAGES[stageId - 1].short.toLowerCase()} <ArrowRight size={17} /> {next.short}</> : "Confirmar entrega y cerrar pedido";
  const finishBtn = (disabled, data) => (
    <Button variant="primary" size="lg" className="w-full sm:w-auto" disabled={disabled} busy={busy} onClick={() => finalize(data())}>{finishLabel}</Button>
  );

  if (stageId === 1) {
    return (
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PdfUploader orderId={orderId} kind="pedido" label="PDF del pedido" required uploadedPath={pdfPath} onUploaded={setPdfPath} />
          <PdfUploader orderId={orderId} kind="rut" label="RUT (opcional)" uploadedPath={rutPath} onUploaded={setRutPath} />
        </div>
        <ActionBar hint={!pdfPath && "Sube el PDF del pedido para continuar."}>
          {finishBtn(!pdfPath, () => ({ pdfPath, rutPath: rutPath || null }))}
        </ActionBar>
      </div>
    );
  }
  if (stageId === 2) {
    const count = serialesList.filter((s) => s.trim()).length;
    return (
      <div>
        <p className="label">Seriales{count ? ` · ${count} registrado${count > 1 ? "s" : ""}` : ""}</p>
        <SerialListEditor list={serialesList} setList={setSerialesList} disabled={sinSerial} />
        <label className="mt-4 h-12 sm:h-10 px-3 rounded-xl flex items-center gap-3 shadow-[inset_0_0_0_1px_#E3E3E3] cursor-pointer">
          <span className="flex-1 text-[14px] sm:text-[13.5px]">Este pedido no lleva seriales</span>
          <input type="checkbox" checked={sinSerial} onChange={(e) => setSinSerial(e.target.checked)} className="peer sr-only" />
          <span className="w-10 h-6 rounded-full bg-[#C9C9C9] relative transition-colors peer-checked:bg-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-focus after:absolute after:top-[3px] after:left-[3px] after:w-[18px] after:h-[18px] after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
        </label>
        <ActionBar hint={!hasSerial && !sinSerial && "Escanea al menos un serial, o marca que el pedido no lleva."}>
          {finishBtn(!hasSerial && !sinSerial, () => {
            const clean = serialesList.map((s) => s.trim()).filter(Boolean);
            return { serialesList: sinSerial ? [] : clean, seriales: sinSerial ? "Sin serial" : clean.join(", ") };
          })}
        </ActionBar>
      </div>
    );
  }
  if (stageId === 3) {
    return (
      <div>
        <label className="label" htmlFor="factura">Número de factura</label>
        <input id="factura" value={factura} onChange={(e) => setFactura(e.target.value)} placeholder="Ej: FE-2026-9041" className="field" />
        <ActionBar hint={!factura.trim() && "Escribe el número de factura para continuar."}>
          {finishBtn(!factura.trim(), () => ({ factura: factura.trim() }))}
        </ActionBar>
      </div>
    );
  }
  const missingGuide = modoEntrega === "guia" && !guiaNumero.trim() && !guiaFilePath;
  return (
    <div className="space-y-4">
      <DeliveryModePicker value={modoEntrega} onChange={setModoEntrega} />
      {modoEntrega === "guia" && (
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="guia">Número de guía</label>
            <input id="guia" value={guiaNumero} onChange={(e) => setGuiaNumero(e.target.value)} placeholder="Ej: 700012345678" className="field" />
          </div>
          <GuideUploader orderId={orderId} label="Foto o PDF de la guía" uploadedPath={guiaFilePath} onUploaded={setGuiaFilePath} />
          <p className="text-[12.5px] text-ink2">Basta con el número o con el archivo; puedes registrar ambos.</p>
        </div>
      )}
      <ActionBar hint={missingGuide && "Escribe el número de guía o sube la foto/PDF para cerrar el pedido."}>
        {finishBtn(missingGuide, () => ({ modo: modoEntrega, guiaNumero: guiaNumero.trim() || null, guiaFilePath }))}
      </ActionBar>
    </div>
  );
}
