/* ============ TOKENS DE DISEÑO ============
 * Sistema estándar de la categoría con acabado tipo Shopify Polaris / Stripe Dashboard
 * (ver PRODUCT.md → Brand Commitments). Se exponen como colores de Tailwind en
 * tailwind.config.js (bg-surface, text-ink2, bg-critBg...), así que los componentes
 * usan clases; este objeto queda para los lugares que necesitan el valor en JS (gráficas).
 */
export const C = {
  // superficies
  bg: "#F1F2F4", surface: "#FFFFFF", surface2: "#F7F7F8", nav: "#EBEBEB", topbar: "#1A1A1A", topbarField: "#303030",
  // texto
  ink: "#202223", ink2: "#616161", ink3: "#8A8A8A",
  // líneas
  line: "#E3E3E3", line2: "#EBEBEB",
  // acciones
  primary: "#202223", link: "#005BD3", focus: "#005BD3",
  // estados (texto / fondo / barra)
  crit: "#8E1F0B", critBg: "#FEE9E8", critBar: "#E51C00",
  warn: "#5E4200", warnBg: "#FFF1D6", warnBar: "#E8A200",
  ok: "#0C5132", okBg: "#CDFEE1", okBar: "#29845A",
  neutral: "#4A4A4A", neutralBg: "#EBEBEB",
  info: "#00527C", infoBg: "#E0F0FF", infoBar: "#9BB8F0",
  // serie de datos en gráficas
  series: "#4F5FD6", seriesSoft: "#C9CCE8",
};

export const FONT_SANS = "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";
