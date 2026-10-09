import React from "react";
import { Upload, FileCheck2, ExternalLink, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { openDocument } from "../../services/storage";
import Button, { buttonClass } from "../ui/Button";

// Botón que abre el selector de archivos (label + input oculto, accesible con teclado)
function FilePickButton({ accept, onFile, disabled, variant, icon: Icon, children }) {
  return (
    <label className={`${buttonClass({ variant, size: "sm" })} focus-within:outline focus-within:outline-2 focus-within:outline-focus ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
      <input type="file" accept={accept} className="sr-only" onChange={onFile} disabled={disabled} />
      <Icon size={14} strokeWidth={2.2} aria-hidden="true" />{children}
    </label>
  );
}

// Casilla de documento compartida por PdfUploader y GuideUploader
export default function FileSlot({ label, required, uploadedPath, busy, error, accept, hint, onFile, onRemove }) {
  return (
    <div className={`rounded-xl p-3 ${uploadedPath ? "bg-okBg/40 shadow-[inset_0_0_0_1px_#B7E4C9]" : "shadow-[inset_0_0_0_1px_#E3E3E3]"}`}>
      <div className="flex items-center gap-2.5">
        <span className={`w-9 h-9 rounded-lg grid place-items-center flex-none ${uploadedPath ? "bg-okBg text-ok" : "bg-surface2 text-ink2"}`}>
          {busy ? <Loader2 size={17} className="animate-spin" /> : uploadedPath ? <FileCheck2 size={17} /> : <Upload size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[14px] sm:text-[13.5px] truncate">{label}{required && <span className="text-crit"> *</span>}</p>
          <p className="text-[12.5px] text-ink2">{busy ? "Subiendo…" : uploadedPath ? "Cargado" : hint}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-2.5">
        {uploadedPath ? (
          <>
            <Button size="sm" icon={ExternalLink} onClick={() => openDocument(uploadedPath)}>Ver documento</Button>
            <FilePickButton accept={accept} onFile={onFile} disabled={busy} variant="secondary" icon={RefreshCw}>Reemplazar</FilePickButton>
            {onRemove && <Button size="sm" icon={Trash2} onClick={onRemove}>Quitar</Button>}
          </>
        ) : (
          <FilePickButton accept={accept} onFile={onFile} disabled={busy} variant="secondary" icon={Upload}>Elegir archivo</FilePickButton>
        )}
      </div>
      {error && <p className="text-[12.5px] text-crit mt-1.5" role="alert">{error}</p>}
    </div>
  );
}
