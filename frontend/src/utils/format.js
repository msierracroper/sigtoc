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

// Minutos legibles: 26 → "26 min", 140 → "2 h 20 min"
export function fmtMinutes(min) {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function shortUser(email) { return email ? email.split("@")[0] : "—"; }
