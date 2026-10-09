import React from "react";
import { Plus, X, ScanLine } from "lucide-react";

export default function SerialListEditor({ list, setList, disabled }) {
  const inputRefs = React.useRef([]);
  const pendingFocus = React.useRef(null);

  React.useEffect(() => {
    if (pendingFocus.current !== null && inputRefs.current[pendingFocus.current]) {
      inputRefs.current[pendingFocus.current].focus();
      pendingFocus.current = null;
    }
  }, [list.length]);

  function update(i, val) { const next = [...list]; next[i] = val; setList(next); }
  function add(focusIndex) { pendingFocus.current = focusIndex ?? list.length; setList([...list, ""]); }
  function remove(i) { setList(list.filter((_, idx) => idx !== i)); }

  function handleKeyDown(e, i) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!list[i]?.trim()) return; // lector de barras: no avanzar con campo vacío
    if (i === list.length - 1) add(); // último campo -> crea uno nuevo y lo enfoca (listo para el siguiente escaneo)
    else inputRefs.current[i + 1]?.focus(); // ya hay un campo siguiente -> solo salta a él
  }

  return (
    <div className="space-y-2">
      {list.map((s, i) => (
        <div key={i} className="flex gap-2">
          <label className="relative flex-1">
            <ScanLine size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none" />
            <input
              ref={(el) => (inputRefs.current[i] = el)}
              value={s} disabled={disabled} onChange={(e) => update(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              aria-label={`Serial ${i + 1}`}
              placeholder={`Serial ${i + 1}: escanea o escribe`}
              className="field pl-9 font-medium disabled:opacity-50" />
          </label>
          {list.length > 1 && !disabled && (
            <button onClick={() => remove(i)} aria-label={`Quitar serial ${i + 1}`}
              className="w-11 sm:w-9 flex-none rounded-lg grid place-items-center text-ink2 shadow-[inset_0_0_0_1px_#E3E3E3] hover:bg-surface2">
              <X size={16} />
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <>
          <button onClick={() => add()} className="h-10 sm:h-8 flex items-center gap-1.5 font-semibold text-link">
            <Plus size={16} /> Agregar otro serial
          </button>
          <p className="text-[12.5px] text-ink2">Con lector de código de barras: escanea y presiona Enter, el campo siguiente queda listo solo.</p>
        </>
      )}
    </div>
  );
}
