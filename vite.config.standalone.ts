import { defineConfig, loadEnv } from "vite";
import crypto from "node:crypto";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const key = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  const fp = key
    ? crypto.createHash("sha256").update(key).digest("hex").slice(0, 12)
    : "NOT_SET";
  console.log(`[BLUEAI BUILD DIAG] VITE_SUPABASE_ANON_KEY fingerprint: ${fp}`);

  return {
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
            proxy.on("proxyRes", (proxyRes, _req, _res) => {
              delete proxyRes.headers["x-frame-options"];
              delete proxyRes.headers["content-security-policy"];
            });
          },
        },
      },
    },
    plugins: [react(), tailwindcss()],
  };
});