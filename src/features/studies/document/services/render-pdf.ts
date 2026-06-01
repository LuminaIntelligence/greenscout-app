/**
 * §7.10-Pivot PR 3 — Playwright-PDF-Renderer.
 *
 * Render-Flow (siehe SPEC §4.8):
 *
 *   generateDocumentAction
 *      └─► renderStudyToPdf(studyId)
 *             ├─► chromium.launch() — headless single-tab
 *             ├─► page.goto(`http://127.0.0.1:<PORT>/internal/render-study/<id>`,
 *             │           waitUntil: "networkidle")
 *             ├─► page.evaluate(() => document.fonts.ready) — wait for Gabarito-Fonts
 *             ├─► page.pdf({ printBackground: true, preferCSSPageSize: true,
 *             │             width: "1920px", height: "1080px", landscape: true })
 *             └─► browser.close()
 *
 * Header `x-internal-render-token` schützt die interne Route gegen
 * unbefugten Zugriff via Browser; Token-Match-Logik liegt im Page-Handler.
 *
 * **Persistenz:** PDF wird unter `<GENERATED_DIR>/<studyId>/study-<studyId>-<timestamp>.pdf`
 * persistiert (timestamp = `Date.now()` ms). Pfad ist relativ zum Container-
 * Volume-Root `GENERATED_DIR` (siehe SPEC §6.3 + docker-compose.prod.yml).
 *
 * **Performance:** Pro Render eine neue Chromium-Instance — KEINE Persistence-
 * Pool. KISS für MVP. Wenn später Engpass: `chromium.launchServer()` +
 * Reconnect-Pattern (siehe DECISIONS PR 3).
 *
 * **Error-Handling:** Bei Render-Fehler wird `browser.close()` im finally-
 * Block ausgeführt — sonst orphaned Chromium-Prozesse. Geworfener Error
 * trägt Diagnose-Context (page-status, render-token-set-Flag); Caller
 * (`generateDocumentAction`) mappt das auf `errorCode: "server"`.
 */

import { mkdir } from "node:fs/promises";
import { join as joinPath, resolve as resolvePath } from "node:path";

// Hotfix (2026-06-01) — Playwright wird via dynamic `await import("playwright")`
// im Funktions-Body geladen statt top-level. Hintergrund:
//
//   Next.js's standalone-Tracer kopiert nur Files, die per statischem
//   `import` / `require()` referenziert werden. Playwright lädt zur
//   Laufzeit `playwright-core/browsers.json` via `fs.readFile` — der
//   Tracer übersieht das, die Datei fehlt im Production-Bundle.
//
//   Folge: Ein Top-Level-Import macht den Modul-Load-Fail beim Page-
//   Render-Init sichtbar (der Modul-Graph der Studien-Detail-Seite
//   importiert transitiv `renderStudyToPdf` via Server-Action), und
//   die Detail-Seite wirft 500, BEVOR der User je "Dokument generieren"
//   klickt.
//
//   Lazy-Import verschiebt den potenziellen Lade-Fail in die
//   `renderStudyToPdf`-Funktion selbst — der Page-Render-Modul-Graph
//   bleibt unbeeinflusst, und der Fehler tritt (wenn überhaupt) nur
//   beim tatsächlichen Dokumenten-Generieren auf.
//
// Type-Imports bleiben top-level: `import type` wird vom TypeScript-
// Compiler komplett aus dem Runtime-Bundle ge-stripped — kein
// Lade-Side-Effect.
//
// Siehe DECISIONS.md → "2026-06-01 — Hotfix Pivot-Deploy: Playwright
// im Next.js Standalone-Output".
import type { Browser } from "playwright";

/**
 * Return-Shape von `renderStudyToPdf`. `filename` ist NUR der File-Name
 * (`study-<id>-<timestamp>.pdf`) — die Caller persistieren `absolutePath`
 * in `GeneratedDocument.filename`, weil die existierende Download-Route
 * (`/api/studies/[id]/documents/[docId]/route.ts`) absolute Pfade erwartet.
 */
export interface RenderStudyToPdfResult {
  filename: string;
  absolutePath: string;
}

function resolveBaseUrl(): string {
  // PORT entspricht dem Next.js Server-Port. In dev: 3000; in production:
  // `docker-compose.prod.yml` startet Next.js auf 3000 (intern; nginx
  // proxies von 4000 außen rein, aber innerhalb des Containers ist Next
  // auf 3000). Wir gehen direkt auf 127.0.0.1 — Loopback im Container.
  const port = process.env.PORT ?? "3000";
  return `http://127.0.0.1:${port}`;
}

function resolveGeneratedRoot(): string {
  // Konsistent mit `src/app/api/studies/[id]/documents/[docId]/route.ts`:
  // Default `./generated` in Dev; Docker-Container setzt `GENERATED_DIR=/app/generated`.
  const dir = process.env.GENERATED_DIR;
  if (dir === undefined || dir.length === 0) {
    return resolvePath("./generated");
  }
  return resolvePath(dir);
}

/**
 * Render the React `<StudyDocument>` to PDF via Playwright.
 *
 * @param studyId — primary key des Studies (das Page-Handler-Routen-Param).
 * @returns `{ filename, absolutePath }` der erzeugten PDF-Datei.
 * @throws Error wenn `INTERNAL_RENDER_TOKEN` nicht gesetzt ist, die Render-
 *   Route den Token verwirft (HTTP 404), oder Playwright/Chromium fails.
 */
export async function renderStudyToPdf(studyId: string): Promise<RenderStudyToPdfResult> {
  const token = process.env.INTERNAL_RENDER_TOKEN;
  if (!token || token.length === 0) {
    throw new Error("INTERNAL_RENDER_TOKEN is not configured.");
  }

  const baseUrl = resolveBaseUrl();
  const generatedRoot = resolveGeneratedRoot();
  const studyDir = joinPath(generatedRoot, studyId);
  const filename = `study-${studyId}-${Date.now()}.pdf`;
  const absolutePath = joinPath(studyDir, filename);

  // Stelle das Zielverzeichnis bereit (idempotent — recursive: true ist
  // EEXIST-tolerant).
  await mkdir(studyDir, { recursive: true });

  // Dynamic-import — siehe Hotfix-Kommentar oben.
  const { chromium } = await import("playwright");

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      // --disable-dev-shm-usage: Docker-Default-/dev/shm ist 64MB und
      // reicht Chromium nicht. Compose-File (PR 3) mountet tmpfs auf
      // /dev/shm; das Flag ist Belt-and-Suspenders falls tmpfs fehlt.
      args: ["--disable-dev-shm-usage", "--no-sandbox"],
    });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      extraHTTPHeaders: {
        "x-internal-render-token": token,
      },
    });
    const page = await context.newPage();

    const targetUrl = `${baseUrl}/internal/render-study/${encodeURIComponent(studyId)}`;
    const response = await page.goto(targetUrl, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    if (response === null || !response.ok()) {
      const status = response === null ? "no-response" : response.status();
      // INTERNAL_RENDER_TOKEN_SET ist hier IMMER "true" (wir hätten oben
      // sonst geworfen) — wir loggen es trotzdem als Diagnose-Surface
      // für Post-Mortem-Logs, falls sich die Pre-Check-Logik mal ändert.
      throw new Error(
        `Render-Route lieferte nicht-OK-Status ${status} für ${targetUrl} ` +
          `(INTERNAL_RENDER_TOKEN_SET=true).`,
      );
    }

    // Stelle sicher, dass die Gabarito-Fonts (`next/font/local`) geladen
    // sind, bevor wir das PDF rendern — sonst Fallback-System-Font im
    // PDF-Output. Lambda läuft im Browser-Kontext, nicht im Node-Test —
    // Vitest-Coverage zählt die Lambda als nicht-ausgeführt, das ist OK
    // (sie wird ausgeführt sobald der echte Chromium die Page lädt).
    /* v8 ignore next 2 */
    await page.evaluate(() => document.fonts.ready);

    await page.pdf({
      path: absolutePath,
      width: "1920px",
      height: "1080px",
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return { filename, absolutePath };
  } finally {
    if (browser !== null) {
      // catch-and-swallow: wenn das Schließen fehlschlägt (z. B. weil der
      // Browser bereits crashed ist), wollen wir den ursprünglichen Error
      // nicht überdecken.
      await browser.close().catch(() => {
        // intentionally ignored
      });
    }
  }
}
