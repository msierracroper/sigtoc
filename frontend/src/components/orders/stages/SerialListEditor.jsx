import React from "react";
import { Plus, X } from "lucide-react";
import { C } from "../../../styles/tokens";

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
          <input
            ref={(el) => (inputRefs.current[i] = el)}
            value={s} disabled={disabled} onChange={(e) => update(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            placeholder={`Serial ${i + 1} — escanea o escribe`}
            className="flex-1 text-xs px-3 py-2.5 rounded outline-none disabled:opacity-50" style={{ border: `1px solid ${C.line}` }} />
          {list.length > 1 && !disabled && (
            <button onClick={() => remove(i)} className="px-2.5 rounded" style={{ border: `1px solid ${C.line}`, color: C.inkFaint }}>
              <X size={13} />
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <button onClick={() => add()} className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: C.steel }}>
          <Plus size={12} /> Agregar otro serial
        </button>
      )}
      {!disabled && (
        <p className="text-[10px]" style={{ color: C.inkFaint }}>
          Tip: con lector de código de barras, escanea y presiona Enter — salta solo al siguiente campo.
        </p>
      )}
    </div>
  );
}
