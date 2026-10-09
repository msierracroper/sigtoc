import React from "react";
import { Upload, FileCheck2, ExternalLink, Loader2 } from "lucide-react";
import { openDocument } from "../../services/storage";

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
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 pl-[46px]">
        {uploadedPath ? (
          <>
            <button onClick={() => openDocument(uploadedPath)} className="h-9 sm:h-7 flex items-center gap-1 font-semibold text-link">Ver <ExternalLink size={13} /></button>
            <label className="h-9 sm:h-7 flex items-center font-semibold text-link cursor-pointer">
              <input type="file" accept={accept} className="sr-only" onChange={onFile} disabled={busy} />Reemplazar
            </label>
            {onRemove && <button onClick={onRemove} className="h-9 sm:h-7 font-semibold text-ink2 hover:text-ink">Quitar</button>}
          </>
        ) : (
          <label className="h-9 sm:h-7 flex items-center font-semibold text-link cursor-pointer focus-within:underline">
            <input type="file" accept={accept} className="sr-only" onChange={onFile} disabled={busy} />Elegir archivo
          </label>
        )}
      </div>
      {error && <p className="text-[12.5px] text-crit mt-1.5 pl-[46px]" role="alert">{error}</p>}
    </div>
  );
}
