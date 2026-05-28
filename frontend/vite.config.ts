import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("/node_modules/")) return undefined;

          if (id.includes("/@mui/") || id.includes("/@emotion/")) {
            return "vendor-mui";
          }

          if (id.includes("/framer-motion/") || id.includes("/motion-dom/") || id.includes("/motion-utils/")) {
            return "vendor-motion";
          }

          if (id.includes("/react-markdown/") || id.includes("/remark-gfm/") || id.includes("/micromark") || id.includes("/mdast") || id.includes("/hast") || id.includes("/unified/")) {
            return "vendor-markdown";
          }

          if (id.includes("/pdfjs-dist/")) {
            return "pdf";
          }

          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname
    }
  },
  server: {
    host: "127.0.0.1",
    port: 3333,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      }
    }
  }
});
