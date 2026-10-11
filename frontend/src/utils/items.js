// Artículos de Bodega (Etapa 2): pares referencia + serial, ej. { ref: "BOC", serial: "701233131" }.
// Formato guardado en stages[2].data:
//   { items: [{ref, serial}], serialesList: [serial...], seriales: "BOC 701233131, …" }
// serialesList / seriales se conservan por compatibilidad con pedidos anteriores (solo seriales, sin referencia).

export const emptyItem = (ref = "") => ({ ref, serial: "" });

// Lee los artículos de una etapa 2 guardada (formato nuevo o anterior)
export function itemsFromData(data) {
  if (data?.items?.length) return data.items.map((i) => ({ ref: i.ref || "", serial: i.serial || "" }));
  const legacy = data?.serialesList?.length
    ? data.serialesList
    : data?.seriales && data.seriales !== "Sin serial" ? data.seriales.split(",").map((s) => s.trim()).filter(Boolean) : [];
  return legacy.map((serial) => ({ ref: "", serial }));
}

// Artículos válidos: el serial define el artículo. Una fila sin serial se ignora (p. ej. la fila nueva
// que deja el lector con la referencia heredada, esperando el siguiente escaneo).
export function cleanItems(items) {
  return items.map((i) => ({ ref: i.ref.trim(), serial: i.serial.trim() })).filter((i) => i.serial);
}

// Primera fila con serial pero sin referencia (1-based), o 0 si no hay ninguna
export function firstIncompleteRow(items) {
  return items.findIndex((i) => i.serial.trim() && !i.ref.trim()) + 1;
}

export function itemLabel(i) { return [i.ref, i.serial].filter(Boolean).join(" "); }

// Datos de la etapa 2 a partir de los artículos
export function stageDataFromItems(items, sinSerial) {
  if (sinSerial) return { items: [], serialesList: [], seriales: "Sin serial" };
  const clean = cleanItems(items);
  return { items: clean, serialesList: clean.map((i) => i.serial), seriales: clean.length ? clean.map(itemLabel).join(", ") : "Sin serial" };
}
