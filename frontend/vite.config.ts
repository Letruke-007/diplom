import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
      "/d": "http://localhost:8000",
    },
  },
}));
