// Fotos tomadas con el celular (guías, comprobantes) pesan 2–5 MB. Antes de subirlas se reducen
// a un tamaño que sigue siendo legible (~200–400 KB) para no llenar el almacenamiento.
const MAX_SIDE = 1600; // px del lado más largo
const QUALITY = 0.78;
const COMPRESSIBLE = /^image\/(jpeg|png|webp|heic|heif)$/i;

export const MAX_UPLOAD_MB = 15;

// Devuelve un File JPEG reducido, o el original si no es una foto, si el navegador
// no la puede leer (p. ej. HEIC fuera de Safari) o si el resultado no pesa menos.
export async function compressImage(file) {
  if (!COMPRESSIBLE.test(file.type || "") || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; // los PNG con transparencia quedan sobre blanco al pasar a JPEG
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;
    const name = (file.name || "foto").replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
