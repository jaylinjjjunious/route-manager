import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: ".",
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api/proxy/ce-checkin": {
        target: "https://www.cecheckin.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy\/ce-checkin/, ""),
        configure: (proxy, _options) => {
          proxy.on("proxyRes", (proxyRes, req, res) => {
            delete proxyRes.headers["x-frame-options"];
            delete proxyRes.headers["content-security-policy"];
          });
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
});
