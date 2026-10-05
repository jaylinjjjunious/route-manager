import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execFileSync } from 'node:child_process';

let frontendCommit = process.env.RENDER_GIT_COMMIT || process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA;
if (!frontendCommit) {
  try { frontendCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { frontendCommit = 'local'; }
}

export default defineConfig({
  root: ".",
  publicDir: "public",
  define: { 'import.meta.env.VITE_FRONTEND_COMMIT': JSON.stringify(frontendCommit) },
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
