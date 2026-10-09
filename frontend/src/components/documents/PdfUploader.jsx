import React, { useState } from "react";
import { uploadOrderPdf } from "../../services/storage";
import FileSlot from "./FileSlot";

export default function PdfUploader({ orderId, kind, label, required, onUploaded, uploadedPath }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type && file.type !== "application/pdf") { setError("El archivo debe ser PDF."); return; }
    setBusy(true); setError("");
    const { path, error: err } = await uploadOrderPdf(orderId, kind, file);
    setBusy(false);
    if (err) { setError("No se pudo subir el archivo. Revisa tu conexión e inténtalo de nuevo."); return; }
    onUploaded(path);
  }

  return <FileSlot label={label} required={required} uploadedPath={uploadedPath} busy={busy} error={error}
    accept="application/pdf" hint="PDF" onFile={handleFile} />;
}
