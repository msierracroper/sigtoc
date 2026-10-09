export function nowIso() { return new Date().toISOString(); }

export function fmtClock(d) { return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }); }

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// "9 oct" (ejes de gráficas y fechas cortas)
export function fmtDay(date) {
  const d = new Date(date);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// Formato único de fecha en toda la app: "9 oct, 09:30"
export function fmtShort(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${fmtDay(d)}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Minutos legibles: 26 → "26 min", 140 → "2 h 20 min", 92128 → "63 d 23 h" (desde 48 h se cuenta en días)
export function fmtMinutes(min) {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  if (m >= 48 * 60) {
    const d = Math.floor(m / 1440);
    const h = Math.floor((m % 1440) / 60);
    return h ? `${d} d ${h} h` : `${d} d`;
  }
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

// Tiempo transcurrido en una etapa junto a su límite: "38 de 45 min" · "2 h 5 min de 60 min" · "63 d 23 h de 1 min"
export function fmtElapsed(elapsedMin) {
  return elapsedMin < 60 ? String(Math.floor(elapsedMin)) : fmtMinutes(elapsedMin);
}

export function shortUser(email) { return email ? email.split("@")[0] : "—"; }
