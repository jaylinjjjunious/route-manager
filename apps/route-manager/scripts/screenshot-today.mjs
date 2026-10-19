/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Captures AIØ Today screen screenshots (dark + light) at 320/390/430 px.
 * Boots a local dev server with VITE_TODAY_SCREENSHOT_MODE=true (dev-only
 * auth bypass) and placeholder Supabase vars, then drives Playwright.
 *
 * Output: screenshots/today-{theme}-{width}.png
 *
 * Usage: node scripts/screenshot-today.mjs
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import http from "node:http";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "screenshots");

const PORT = 5199;
const URL = `http://localhost:${PORT}`;

const env = {
  ...process.env,
  VITE_SUPABASE_URL: "https://placeholder.supabase.co",
  VITE_SUPABASE_ANON_KEY: "placeholder-anon-key",
  VITE_TODAY_SCREENSHOT_MODE: "true",
  VITE_ENABLE_SMART_AISLE_TEST_LAB: "false",
};

const VIEWPORTS = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
];

const THEMES = ["dark", "light"];

function waitForPort(port, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const probe = () => {
      const req = http.request(
        { host: "localhost", port, path: "/", timeout: 1000 },
        (res) => {
          res.resume();
          resolve();
        },
      );
      req.on("error", () => {
        if (Date.now() > deadline) reject(new Error("Dev server did not start in time"));
        else setTimeout(probe, 500);
      });
      req.on("timeout", () => req.destroy());
      req.end();
    };
    probe();
  });
}

async function main() {
  const viteCli = path.join(repoRoot, "node_modules", "vite", "bin", "vite.js");
  const server = spawn(
    process.execPath,
    [viteCli, "--config", "vite.config.standalone.ts", "--port", String(PORT), "--strictPort"],
    { cwd: repoRoot, env, stdio: ["ignore", "pipe", "pipe"] },
  );
  server.stdout.on("data", () => {});
  server.stderr.on("data", () => {});

  try {
    await waitForPort(PORT);

    await mkdir(outDir, { recursive: true });
    const browser = await chromium.launch();
    const results = [];

    for (const theme of THEMES) {
      for (const vp of VIEWPORTS) {
        const context = await browser.newContext({
          viewport: vp,
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true,
        });
        await context.addInitScript((t) => {
          window.localStorage.setItem("route_optimizer_theme", t);
        }, theme);

        const page = await context.newPage();
        await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });

        await page.waitForSelector("#tab-view-dashboard", { timeout: 30000 });
        await page.waitForSelector('text=/AIØ/', { timeout: 15000 });

        // Let derived data (route, preview guide, weather) settle.
        await page.waitForTimeout(1500);

        const outFile = path.join(outDir, `today-${theme}-${vp.width}.png`);
        await page.screenshot({ path: outFile, fullPage: false });
        results.push(outFile);
        await context.close();
      }
    }

    await browser.close();
    console.log("Screenshots written:");
    results.forEach((f) => console.log("  " + f));
  } finally {
    server.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
