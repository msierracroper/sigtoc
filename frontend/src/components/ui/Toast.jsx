import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

// Confirmación breve de una acción (o su error). Se cierra sola a los 5 s.
export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, toast.tone === "error" ? 8000 : 5000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  const error = toast.tone === "error";
  return (
    <div className="fixed z-[60] bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-md" role="status" aria-live="polite">
      <div className="flex items-start gap-2.5 bg-topbar text-white rounded-xl px-4 py-3 shadow-pop animate-[toastIn_.2s_cubic-bezier(.2,.8,.2,1)]">
        {error ? <AlertCircle size={18} className="text-[#FF8A7A] flex-none mt-px" /> : <CheckCircle2 size={18} className="text-[#5FD39A] flex-none mt-px" />}
        <p className="text-[14px] flex-1">{toast.message}</p>
        <button onClick={onClose} aria-label="Cerrar aviso" className="-m-1 p-1 text-white/60 hover:text-white"><X size={16} /></button>
      </div>
    </div>
  );
}
