import { C, FONT_SANS } from "./tokens";

// Estilos compartidos de las gráficas (recharts) del módulo de reportes
export const chartFont = { fontSize: 11.5, fontFamily: FONT_SANS, fill: C.ink2 };

export const chartTooltipStyle = {
  fontSize: 12, fontFamily: FONT_SANS, color: "#fff", background: C.topbar,
  border: "none", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,.2)", padding: "8px 10px",
};
