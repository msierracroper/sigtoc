import { fileURLToPath } from "node:url";

export default {
  plugins: {
    // Ruta explícita: el build corre desde la raíz del repo, no desde ./frontend.
    tailwindcss: { config: fileURLToPath(new URL("./tailwind.config.js", import.meta.url)) },
    autoprefixer: {},
  },
};
