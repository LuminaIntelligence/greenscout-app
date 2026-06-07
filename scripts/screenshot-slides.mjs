/**
 * Pivot-2b — Playwright-Screenshot-Skript für die 19 React-Slide-
 * Komponenten unter `src/features/studies/document/slides/`.
 *
 * Output: `docs/pivot/visual-verification/rendered-slide-NN.png`
 * (PNG 1920×1080 — entspricht der `.slide-frame`-Logical-Pixel-Dim
 * aus globals.css).
 *
 * Workflow:
 *  1. Startet `npx next dev` auf Port 3939 (im Hintergrund).
 *  2. Wartet bis `http://127.0.0.1:3939/dev/slides?only=1` 200 liefert.
 *  3. Iteriert i=1..19, jeweils Page-Goto + Screenshot des `.slide-frame`-
 *     Elements (clip auf den 1920×1080-Container).
 *  4. Killt den dev server.
 *
 * Voraussetzung: `npx playwright install chromium` einmalig.
 *
 * Aufruf:
 *   node scripts/screenshot-slides.mjs
 *
 * **Sandbox-Caveat.** In CI / Agent-Sandboxes ohne next-dev oder ohne
 * playwright-chromium scheitert das Skript. Das ist OK: die PNGs werden
 * EINMAL lokal generiert und committed, danach sind sie als persistente
 * Artifacts im PR. Wenn Slides sich ändern, läuft das Skript erneut.
 */

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { setTimeout as wait } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(REPO_ROOT, "docs", "pivot", "visual-verification");

const PORT = 3939;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SLIDE_COUNT = 19;
const READY_TIMEOUT_MS = 120_000;

async function waitForReady() {
  const start = Date.now();
  while (Date.now() - start < READY_TIMEOUT_MS) {
    try {
      const res = await fetch(`${BASE_URL}/dev/slides?only=1`);
      if (res.ok) {
        return;
      }
    } catch {
      /* not up yet */
    }
    await wait(1000);
  }
  throw new Error(`next dev never became ready on port ${PORT}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // Start next dev in the background.
  console.log(`Starting next dev on port ${PORT}...`);
  const devProc = spawn("npx", ["next", "dev", "-p", String(PORT)], {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });
  devProc.stdout?.on("data", (b) => process.stdout.write(`[next] ${b}`));
  devProc.stderr?.on("data", (b) => process.stderr.write(`[next] ${b}`));

  try {
    await waitForReady();
    console.log("next dev is up. Launching Chromium...");

    const browser = await chromium.launch();
    const ctx = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();

    for (let i = 1; i <= SLIDE_COUNT; i++) {
      const url = `${BASE_URL}/dev/slides?only=${i}`;
      const outPath = path.join(OUT_DIR, `rendered-slide-${String(i).padStart(2, "0")}.png`);
      console.log(`  Slide ${i} → ${path.relative(REPO_ROOT, outPath)}`);
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForSelector(".slide-frame", { timeout: 30_000 });
      // Ensure all fonts are loaded before screenshot.
      await page.evaluate(() => document.fonts.ready);
      const frame = page.locator(".slide-frame").first();
      await frame.screenshot({ path: outPath });
    }

    await browser.close();
    console.log(`Done. ${SLIDE_COUNT} PNGs written to ${path.relative(REPO_ROOT, OUT_DIR)}.`);
  } finally {
    devProc.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
