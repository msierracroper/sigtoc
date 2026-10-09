import React, { useState } from "react";
import { uploadGuideFile } from "../../services/storage";
import FileSlot from "./FileSlot";

export default function GuideUploader({ orderId, label, onUploaded, uploadedPath }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true); setError("");
    const { path, error: err } = await uploadGuideFile(orderId, file);
    setBusy(false);
    if (err) { setError("No se pudo subir el archivo. Revisa tu conexión e inténtalo de nuevo."); return; }
    onUploaded(path);
  }

  return <FileSlot label={label} uploadedPath={uploadedPath} busy={busy} error={error}
    accept="application/pdf,image/*" hint="Foto o PDF" onFile={handleFile} onRemove={() => onUploaded(null)} />;
}
