import { supabase, PDF_BUCKET } from "../lib/supabaseClient";

// PDF del pedido o RUT de la Etapa 1 -> {orderId}/{kind}.pdf
export async function uploadOrderPdf(orderId, kind, file) {
  const path = `${orderId}/${kind}.pdf`;
  const { error } = await supabase.storage.from(PDF_BUCKET).upload(path, file, { upsert: true, contentType: "application/pdf" });
  return { path, error };
}

// Guía de envío de la Etapa 4 (PDF o imagen) -> {orderId}/guia-{timestamp}.{ext}
export async function uploadGuideFile(orderId, file) {
  const ext = (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
  const path = `${orderId}/guia-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(PDF_BUCKET).upload(path, file, { upsert: true, contentType: file.type || "application/octet-stream" });
  return { path, error };
}

// Abre el documento en una pestaña nueva con una URL firmada de 60 s (el bucket es privado)
export async function openDocument(path) {
  const { data } = await supabase.storage.from(PDF_BUCKET).createSignedUrl(path, 60);
  if (data?.signedUrl) window.open(data.signedUrl, "_blank");
}
