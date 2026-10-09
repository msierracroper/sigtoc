import React, { useState } from "react";
import { Upload, FileCheck, ExternalLink } from "lucide-react";
import { C } from "../../styles/tokens";
import { uploadGuideFile, openDocument } from "../../services/storage";

export default function GuideUploader({ orderId, label, onUploaded, uploadedPath }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError("");
    const { path, error: err } = await uploadGuideFile(orderId, file);
    setBusy(false);
    if (err) { setError("No se pudo subir el archivo."); return; }
    onUploaded(path);
  }

  async function viewFile() {
    await openDocument(uploadedPath);
  }

  return (
    <div className="px-3 py-3 rounded" style={{ backgroundColor: C.paperDark }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {uploadedPath ? <FileCheck size={14} color={C.ok} /> : <Upload size={14} color={C.steel} />}
          <span className="text-xs font-medium">{label}</span>
        </div>
        {uploadedPath && (
          <div className="flex items-center gap-2">
            <button onClick={viewFile} className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: C.steel }}>
              Ver <ExternalLink size={11} />
            </button>
            <button onClick={() => onUploaded(null)} className="text-[11px]" style={{ color: C.inkFaint }}>Quitar</button>
          </div>
        )}
      </div>
      {!uploadedPath && (
        <label className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer" style={{ color: C.steel }}>
          <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFile} disabled={busy} />
          {busy ? "Subiendo..." : "Elegir foto o PDF de la guía"}
        </label>
      )}
      {error && <p className="text-[10px] mt-1" style={{ color: C.alert }}>{error}</p>}
    </div>
  );
}
