import { C, FONT_SANS } from "./src/styles/tokens.js";

/** @type {import('tailwindcss').Config} */
export default {
  // relative: rutas resueltas desde este archivo (el build corre desde la raíz del repo).
  content: {
    relative: true,
    files: ["./index.html", "./src/**/*.{js,jsx}"],
  },
  theme: {
    extend: {
      // Mismos tokens que src/styles/tokens.js: bg-surface, text-ink2, bg-critBg, border-line...
      colors: C,
      fontFamily: { sans: [FONT_SANS] },
      boxShadow: {
        card: "0 1px 0 rgba(26,26,26,.07), 0 1px 3px rgba(26,26,26,.08)",
        btn: "inset 0 -1px 0 rgba(255,255,255,.12), 0 1px 2px rgba(0,0,0,.25)",
        pop: "0 8px 24px rgba(26,26,26,.16), 0 1px 3px rgba(26,26,26,.1)",
      },
    },
  },
  plugins: [],
};
