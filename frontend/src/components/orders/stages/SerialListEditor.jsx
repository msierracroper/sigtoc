import React from "react";
import { Plus, X, ScanLine } from "lucide-react";
import Button from "../../ui/Button";
import { emptyItem } from "../../../utils/items";

// Artículos de Bodega: referencia + serial por fila, pensado para lector de código de barras.
// Enter en Referencia → salta al Serial. Enter en Serial → fila nueva con la misma referencia, lista para el siguiente escaneo.
export default function SerialListEditor({ items, setItems, disabled }) {
  const inputs = React.useRef({});
  const pendingFocus = React.useRef(null); // { row, field }

  React.useEffect(() => {
    const p = pendingFocus.current;
    if (p && inputs.current[`${p.row}-${p.field}`]) {
      inputs.current[`${p.row}-${p.field}`].focus();
      pendingFocus.current = null;
    }
  }, [items.length]);

  function update(i, field, val) {
    const v = field === "ref" ? val.toUpperCase() : val; // "boc" y "BOC" son la misma referencia
    setItems(items.map((it, idx) => (idx === i ? { ...it, [field]: v } : it)));
  }
  function remove(i) { setItems(items.filter((_, idx) => idx !== i)); }
  function add() {
    const prevRef = items[items.length - 1]?.ref.trim() || "";
    pendingFocus.current = { row: items.length, field: prevRef ? "serial" : "ref" };
    setItems([...items, emptyItem(prevRef)]);
  }

  function onKeyDown(e, i, field) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!items[i]?.[field]?.trim()) return; // lector de barras: no avanzar con el campo vacío
    if (field === "ref") { inputs.current[`${i}-serial`]?.focus(); return; }
    if (i === items.length - 1) add();
    else inputs.current[`${i + 1}-serial`]?.focus();
  }

  const fieldCls = "field font-medium disabled:opacity-50";

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2 pr-[52px] sm:pr-11 text-[12.5px] font-semibold text-ink2" aria-hidden="true">
        <span>Referencia</span><span>Serial</span>
      </div>
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <div className="flex-1 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
            <input
              ref={(el) => (inputs.current[`${i}-ref`] = el)}
              value={it.ref} disabled={disabled} onChange={(e) => update(i, "ref", e.target.value)}
              onKeyDown={(e) => onKeyDown(e, i, "ref")}
              aria-label={`Referencia ${i + 1}`} placeholder="Ej: BOC"
              className={fieldCls} />
            <label className="relative">
              <ScanLine size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none" />
              <input
                ref={(el) => (inputs.current[`${i}-serial`] = el)}
                value={it.serial} disabled={disabled} onChange={(e) => update(i, "serial", e.target.value)}
                onKeyDown={(e) => onKeyDown(e, i, "serial")}
                aria-label={`Serial ${i + 1}`} placeholder="Escanea o escribe"
                className={`${fieldCls} pl-9 num`} />
            </label>
          </div>
          {items.length > 1 && !disabled ? (
            <button onClick={() => remove(i)} aria-label={`Quitar fila ${i + 1}`}
              className="w-11 sm:w-9 flex-none rounded-lg grid place-items-center text-ink2 shadow-[inset_0_0_0_1px_#E3E3E3] hover:bg-surface2">
              <X size={16} />
            </button>
          ) : <span className="w-11 sm:w-9 flex-none" aria-hidden="true" />}
        </div>
      ))}
      {!disabled && (
        <>
          <Button size="sm" icon={Plus} onClick={add}>Agregar artículo</Button>
          <p className="text-[12.5px] text-ink2">Con lector de código de barras: Enter en la referencia pasa al serial; Enter en el serial abre una fila nueva con la misma referencia, lista para escanear.</p>
        </>
      )}
    </div>
  );
}
