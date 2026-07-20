import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Optional static design-board build. It deliberately emits to a different
 * directory and can never enter the native Void Client payload.
 */
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    outDir: "dist-workflow",
    emptyOutDir: true,
    rollupOptions: {
      input: fileURLToPath(new URL("./workflow.html", import.meta.url)),
    },
  },
});
