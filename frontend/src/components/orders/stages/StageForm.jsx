import React, { useEffect, useRef, useState } from "react";
import { Truck, Store, ArrowRight, Check, Loader2, AlertCircle } from "lucide-react";
import { fmtShort, shortUser } from "../../../utils/format";
import { emptyItem, itemsFromData, cleanItems, firstIncompleteRow, stageDataFromItems } from "../../../utils/items";
import { STAGES } from "../../../constants/stages";
import Button from "../../ui/Button";
import PdfUploader from "../../documents/PdfUploader";
import GuideUploader from "../../documents/GuideUploader";
import SerialListEditor from "./SerialListEditor";
import SwitchRow from "../../ui/SwitchRow";
import PaymentPanel from "../PaymentPanel";

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
// missing: lo que falta para poder finalizar (rojo, con ícono). note: aviso informativo (gris).
function ActionBar({ children, missing, note }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] bg-surface border-t border-line2 sm:static sm:mx-0 sm:px-0 sm:pb-0 sm:border-0 sm:bg-transparent mt-5">
      {children}
      <div aria-live="polite">
        {missing
          ? <p className="flex items-start gap-1.5 mt-2 text-[13px] font-medium text-crit"><AlertCircle size={15} className="flex-none mt-px text-critBar" />{missing}</p>
          : note && <p className="text-[12.5px] text-ink2 mt-2">{note}</p>}
      </div>
    </div>
  );
}

// Origen de la venta (obligatorio). Las opciones se administran en Configuración → Orígenes de venta.
// Selector de un catálogo administrable (orígenes de venta, transportadoras). Obligatorio.
function CatalogSelect({ id, label, placeholder, missing, empty, value, onChange, items }) {
  const active = (items || []).filter((o) => o.active || o.name === value);
  return (
    <div>
      <label className="label" htmlFor={id}>{label} <span className="text-crit">*</span></label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className={`field appearance-none bg-no-repeat bg-[right_12px_center] bg-[length:14px] pr-9 cursor-pointer ${value ? "" : "text-ink3"}`}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23616161' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}>
        <option value="" disabled>{placeholder}</option>
        {active.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
      </select>
      {items === null
        ? <p className="text-[12.5px] text-crit mt-1.5">{missing}</p>
        : active.length === 0 && <p className="text-[12.5px] text-ink2 mt-1.5">{empty}</p>}
    </div>
  );
}

// Origen de la venta (Etapa 1). Opciones en Configuración → Orígenes de venta.
export function OriginSelect({ value, onChange, origins }) {
  return <CatalogSelect id="origen" label="Origen de la venta" placeholder="Selecciona de dónde viene la venta" value={value} onChange={onChange} items={origins}
    missing="No se pudieron cargar los orígenes de venta." empty="Aún no hay orígenes configurados. Agrégalos en Configuración → Orígenes de venta." />;
}

// Transportadora (Etapa 4, envío con guía). Opciones en Configuración → Transportadoras.
export function CarrierSelect({ value, onChange, carriers }) {
  return <CatalogSelect id="transportadora" label="Transportadora" placeholder="Selecciona la transportadora" value={value} onChange={onChange} items={carriers}
    missing="No se pudieron cargar las transportadoras." empty="Aún no hay transportadoras configuradas. Agrégalas en Configuración → Transportadoras." />;
}

// Estado del guardado automático del borrador
function DraftStatus({ status, savedAt, onRetry }) {
  if (status === "saving") return <p className="flex items-center gap-1.5 text-[12.5px] text-ink2" role="status"><Loader2 size={13} className="animate-spin" /> Guardando…</p>;
  if (status === "error") return (
    <p className="flex items-center gap-2 text-[12.5px] text-crit" role="alert">
      <AlertCircle size={13} /> No se pudo guardar el borrador.
      <Button size="sm" onClick={onRetry}>Reintentar</Button>
    </p>
  );
  if (savedAt) return <p className="flex items-center gap-1.5 text-[12.5px] text-ink2" role="status"><Check size={13} className="text-okBar" /> Borrador guardado · {fmtShort(savedAt)}</p>;
  return <p className="text-[12.5px] text-ink2">Lo que captures se guarda automáticamente hasta que finalices la etapa.</p>;
}

const DRAFT_DELAY_MS = 700;

// "Recogido, pendiente de guía": se guarda al instante y queda en la auditoría (el SLA sigue contando)
function PickupToggle({ pickup, transportadora, onSetPickup }) {
  const [busy, setBusy] = useState(false);
  const pending = !!pickup?.awaitingGuide;
  return (
    <SwitchRow label="Recogido, pendiente de guía" checked={pending} disabled={busy || (!pending && !transportadora)}
      onChange={async (v) => { setBusy(true); await onSetPickup(v, transportadora); setBusy(false); }}
      description={pending
        ? `Recogido por ${pickup.transportadora} · marcado por ${shortUser(pickup.by)} el ${fmtShort(pickup.at)}. Carga la guía cuando llegue para cerrar el pedido.`
        : transportadora ? "Márcalo si la transportadora ya se llevó el pedido y enviará la guía después." : "Selecciona primero la transportadora."} />
  );
}

export default function StageForm({ order, orderId, stageId, onFinalize, origins, carriers, onSetPaid, onSetProof, onSetPickup, onSaveDraft }) {
  // El formulario arranca con el borrador guardado (si alguien ya había empezado esta etapa)
  const d = order?.stages?.[stageId]?.draft || {};
  const [origen, setOrigen] = useState(d.origen ?? "");
  const [preventa, setPreventa] = useState(!!d.preventa);
  const [pdfPath, setPdfPath] = useState(d.pdfPath ?? null);
  const [rutPath, setRutPath] = useState(d.rutPath ?? null);
  const [items, setItems] = useState(() => { const it = itemsFromData(d); return it.length ? it : [emptyItem()]; });
  const [sinSerial, setSinSerial] = useState(!!d.sinSerial);
  const [factura, setFactura] = useState(d.factura ?? "");
  const [modoEntrega, setModoEntrega] = useState(d.modoEntrega ?? "guia");
  const [transportadora, setTransportadora] = useState(d.transportadora ?? "");
  const [guiaNumero, setGuiaNumero] = useState(d.guiaNumero ?? "");
  const [guiaFilePath, setGuiaFilePath] = useState(d.guiaFilePath ?? null);
  const [busy, setBusy] = useState(false);
  const [draftStatus, setDraftStatus] = useState("idle"); // idle | saving | saved | error
  const [savedAt, setSavedAt] = useState(d.savedAt ?? null);

  // ---- guardado automático ----
  const draft = stageId === 1 ? { origen, preventa, pdfPath, rutPath }
    : stageId === 2 ? { items, sinSerial }
    : stageId === 3 ? { factura }
    : { modoEntrega, transportadora, guiaNumero, guiaFilePath };
  const draftKey = JSON.stringify(draft);
  const lastSaved = useRef(draftKey); // en el primer render el formulario es igual a lo guardado
  const pending = useRef(null);
  const finalized = useRef(false);

  async function persist(key) {
    if (!onSaveDraft || finalized.current || key === lastSaved.current) return;
    setDraftStatus("saving");
    const { error } = await onSaveDraft(stageId, JSON.parse(key));
    if (error) { setDraftStatus("error"); return; }
    lastSaved.current = key;
    setDraftStatus("saved");
    setSavedAt(new Date().toISOString());
  }

  useEffect(() => {
    if (draftKey === lastSaved.current) return;
    clearTimeout(pending.current?.timer);
    const timer = setTimeout(() => { pending.current = null; persist(draftKey); }, DRAFT_DELAY_MS);
    pending.current = { timer, key: draftKey };
    return () => clearTimeout(timer);
  }, [draftKey]);

  // si se sale de la pantalla con un cambio sin guardar, se guarda en ese momento
  useEffect(() => () => { if (pending.current) persist(pending.current.key); }, []);
  const hasItem = items.some((i) => i.serial.trim());
  const incompleteRow = firstIncompleteRow(items);
  const next = STAGES[stageId]; // etapa siguiente (undefined en la 4)

  async function finalize(data) {
    setBusy(true);
    clearTimeout(pending.current?.timer);
    pending.current = null;
    finalized.current = true; // no volver a guardar borrador sobre una etapa ya finalizada
    try { await onFinalize(data); } finally { setBusy(false); }
  }

  const status = <DraftStatus status={draftStatus} savedAt={savedAt} onRetry={() => persist(draftKey)} />;

  const finishLabel = next ? <>Finalizar {STAGES[stageId - 1].short.toLowerCase()} <ArrowRight size={17} /> {next.short}</> : "Confirmar entrega y cerrar pedido";
  const finishBtn = (disabled, data) => (
    <Button variant="primary" size="lg" className="w-full sm:w-auto" disabled={disabled} busy={busy} onClick={() => finalize(data())}>{finishLabel}</Button>
  );

  if (stageId === 1) {
    return (
      <div className="space-y-4">
        {status}
        <OriginSelect value={origen} onChange={setOrigen} origins={origins} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PdfUploader orderId={orderId} kind="pedido" label="PDF del pedido" required uploadedPath={pdfPath} onUploaded={setPdfPath} />
          <PdfUploader orderId={orderId} kind="rut" label="RUT (opcional)" uploadedPath={rutPath} onUploaded={setRutPath} />
        </div>
        <SwitchRow label="Es una preventa" checked={preventa} onChange={setPreventa} tone="info"
          description={preventa ? "Al finalizar Ingreso, el pedido queda en espera de mercancía: Bodega y su SLA arrancan cuando marques que llegó." : "Los productos aún no están en bodega."} />
        {order && onSetPaid && (
          <div className="pt-4 border-t border-line2">
            <PaymentPanel order={order} onSetPaid={onSetPaid} onSetProof={onSetProof} embedded />
          </div>
        )}
        <ActionBar missing={!origen ? "Selecciona el origen de la venta para continuar." : !pdfPath ? "Sube el PDF del pedido para continuar." : null}
          note={preventa ? "Al finalizar, el pedido quedará en stand by hasta que llegue la mercancía." : null}>
          {finishBtn(!pdfPath || !origen, () => ({ pdfPath, rutPath: rutPath || null, origen, preventa }))}
        </ActionBar>
      </div>
    );
  }
  if (stageId === 2) {
    const count = cleanItems(items).filter((i) => i.serial).length;
    return (
      <div>
        <div className="mb-3">{status}</div>
        <p className="label">Artículos{count ? ` · ${count} registrado${count > 1 ? "s" : ""}` : ""}</p>
        <SerialListEditor items={items} setItems={setItems} disabled={sinSerial} />
        <div className="mt-4"><SwitchRow label="Este pedido no lleva seriales" checked={sinSerial} onChange={setSinSerial} /></div>
        <ActionBar missing={sinSerial ? null : incompleteRow ? `Completa la referencia y el serial de la fila ${incompleteRow}.` : !hasItem ? "Registra al menos un artículo (referencia y serial), o marca que el pedido no lleva seriales." : null}>
          {finishBtn(!sinSerial && (!hasItem || incompleteRow > 0), () => stageDataFromItems(items, sinSerial))}
        </ActionBar>
      </div>
    );
  }
  if (stageId === 3) {
    return (
      <div>
        <div className="mb-3">{status}</div>
        <label className="label" htmlFor="factura">Número de factura</label>
        <input id="factura" value={factura} onChange={(e) => setFactura(e.target.value)} placeholder="Ej: FE-2026-9041" className="field" />
        <ActionBar missing={!factura.trim() ? "Escribe el número de factura para continuar." : null}>
          {finishBtn(!factura.trim(), () => ({ factura: factura.trim() }))}
        </ActionBar>
      </div>
    );
  }
  const isGuide = modoEntrega === "guia";
  const missingCarrier = isGuide && !transportadora;
  const missingGuide = isGuide && !guiaNumero.trim() && !guiaFilePath;
  const pickup = order?.stages?.[4]?.pickup;
  return (
    <div className="space-y-4">
      {status}
      <DeliveryModePicker value={modoEntrega} onChange={setModoEntrega} />
      {isGuide && (
        <div className="space-y-3">
          <CarrierSelect value={transportadora} onChange={setTransportadora} carriers={carriers} />
          {onSetPickup && <PickupToggle pickup={pickup} transportadora={transportadora} onSetPickup={onSetPickup} />}
          <div>
            <label className="label" htmlFor="guia">Número de guía</label>
            <input id="guia" value={guiaNumero} onChange={(e) => setGuiaNumero(e.target.value)} placeholder="Ej: 700012345678" className="field" />
          </div>
          <GuideUploader orderId={orderId} label="Foto o PDF de la guía" uploadedPath={guiaFilePath} onUploaded={setGuiaFilePath} />
          <p className="text-[12.5px] text-ink2">Basta con el número o con el archivo; puedes registrar ambos.</p>
        </div>
      )}
      <ActionBar missing={missingCarrier ? "Selecciona la transportadora para cerrar el pedido." : missingGuide ? (pickup?.awaitingGuide ? "Guía pendiente: cuando llegue, escribe el número o sube la foto/PDF para cerrar el pedido." : "Escribe el número de guía o sube la foto/PDF para cerrar el pedido.") : null}>
        {finishBtn(missingCarrier || missingGuide, () => ({ modo: modoEntrega, transportadora: isGuide ? transportadora : null, guiaNumero: isGuide ? guiaNumero.trim() || null : null, guiaFilePath: isGuide ? guiaFilePath : null,
          ...(isGuide && pickup?.at ? { recogidoSinGuia: { at: pickup.at, by: pickup.by, transportadora: pickup.transportadora } } : {}) }))}
      </ActionBar>
    </div>
  );
}
