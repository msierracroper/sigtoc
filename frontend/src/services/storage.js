import { supabase, PDF_BUCKET } from "../lib/supabaseClient";

// PDF del pedido o RUT de la Etapa 1 -> {orderId}/{kind}.pdf
export async function uploadOrderPdf(orderId, kind, file) {
  const path = `${orderId}/${kind}.pdf`;
  const { error } = await supabase.storage.from(PDF_BUCKET).upload(path, file, { upsert: true, contentType: "application/pdf" });
  return { path, error };
}

// Archivo libre (PDF o imagen) -> {orderId}/{prefix}-{timestamp}.{ext}
async function uploadOrderFile(orderId, prefix, file) {
  const ext = (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
  const path = `${orderId}/${prefix}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(PDF_BUCKET).upload(path, file, { upsert: true, contentType: file.type || "application/octet-stream" });
  return { path, error };
}

// Guía de envío de la Etapa 4
export function uploadGuideFile(orderId, file) { return uploadOrderFile(orderId, "guia", file); }

// Comprobante de pago (foto o PDF)
export function uploadPaymentProof(orderId, file) { return uploadOrderFile(orderId, "pago", file); }

// Abre el documento en una pestaña nueva con una URL firmada de 60 s (el bucket es privado)
export async function openDocument(path) {
  const { data } = await supabase.storage.from(PDF_BUCKET).createSignedUrl(path, 60);
  if (data?.signedUrl) window.open(data.signedUrl, "_blank");
}
