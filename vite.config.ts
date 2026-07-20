import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Vite config for the Tauri frontend and GitHub Pages.
// Tauri expects a fixed dev-server port — it is mirrored in
// src-tauri/tauri.conf.json under build.devUrl.
export default defineConfig({
  // Keep emitted asset URLs relative so the same build works in Tauri and
  // under the repository Pages URL (/Void-Launcher/).
  base: "./",

  plugins: [react(), tailwindcss()],

  resolve: {
    // "@/..." resolves to "src/..." (mirrored in tsconfig.json "paths")
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },

  // Don't clear the terminal — Tauri prints Rust build output there too.
  clearScreen: false,

  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // The Rust side has its own watcher; ignoring it avoids double reloads.
      ignored: ["**/src-tauri/**"],
    },
  },
});
