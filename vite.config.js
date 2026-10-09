import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// El frontend vive en ./frontend, pero el build se sigue ejecutando desde la raíz
// y deja la salida en ./dist, así Vercel no necesita ningún cambio de configuración.
const frontendDir = fileURLToPath(new URL("./frontend", import.meta.url));
const distDir = fileURLToPath(new URL("./dist", import.meta.url));

export default defineConfig({
  root: frontendDir,
  plugins: [react()],
  build: {
    outDir: distDir,
    emptyOutDir: true,
  },
});
