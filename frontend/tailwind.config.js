import { C } from "./src/styles/tokens.js";

/** @type {import('tailwindcss').Config} */
export default {
  // relative: rutas resueltas desde este archivo (el build corre desde la raíz del repo).
  content: {
    relative: true,
    files: ["./index.html", "./src/**/*.{js,jsx}"],
  },
  theme: {
    extend: {
      // Mismos tokens que usa la app (src/styles/tokens.js), disponibles como clases: bg-paper, text-steel, border-line...
      colors: C,
    },
  },
  plugins: [],
};
