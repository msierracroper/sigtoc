import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Modal accesible: mueve el foco adentro al abrir, lo mantiene dentro (Tab), cierra con Esc o
// clic en el fondo y devuelve el foco a quien lo abrió. En el celular sube como hoja desde abajo.
export default function Modal({ title, subtitle, onClose, children, footer, wide }) {
  const titleId = useId();
  const panelRef = useRef(null);
  // quién abrió el modal (se lee en el primer render, antes de que autoFocus mueva el foco)
  const openerRef = useRef(document.activeElement);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const panel = panelRef.current;
    // React ya enfocó el campo con autoFocus (si hay uno) antes de este efecto: lo respetamos.
    const opener = openerRef.current;
    if (!panel.contains(document.activeElement)) panel.focus();

    function onKey(e) {
      if (e.key === "Escape") { e.stopPropagation(); onCloseRef.current(); return; }
      if (e.key !== "Tab") return;
      const items = [...panel.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const firstEl = items[0], lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (opener && typeof opener.focus === "function") opener.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4 bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        className={`w-full ${wide ? "sm:max-w-xl" : "sm:max-w-md"} bg-surface rounded-t-2xl sm:rounded-xl shadow-pop max-h-[90vh] flex flex-col outline-none`}>
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-line2">
          <div>
            <h3 id={titleId} className="text-[15px] font-semibold">{title}</h3>
            {subtitle && <p className="text-[12.5px] text-ink2 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="-m-2.5 w-11 h-11 grid place-items-center rounded-lg text-ink2 hover:bg-surface2"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3.5 pb-[max(14px,env(safe-area-inset-bottom))] border-t border-line2 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
