import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a minimal, self-contained server bundle in `.next/standalone/`
  // so the Docker `runner` stage can `node server.js` without the full
  // node_modules tree (CLAUDE.md §3 + T-007 Dockerfile.web).
  output: "standalone",

  // Hotfix (2026-06-01) — Playwright im Standalone-Output reparieren.
  //
  // Problem: Next.js 15 macht statisches File-Tracing für den
  // standalone-Output und kopiert nur Dateien, die per `require()` /
  // statischem `import` referenziert werden. Playwright lädt zur
  // Laufzeit `playwright-core/browsers.json` via `fs.readFile` —
  // der Tracer übersieht das, die Datei landet nicht in
  // `.next/standalone/node_modules/`. Resultat in Production: 500
  // auf der Studien-Detail-Seite mit
  //   `Cannot find module '/app/node_modules/playwright-core/browsers.json'`
  //
  // Zwei-stufige Fix:
  //   1) `serverExternalPackages` markiert playwright/playwright-core als
  //      externe Pakete — Next.js bundlet sie nicht in den Server-Build,
  //      sondern lädt sie zur Laufzeit aus node_modules.
  //   2) `outputFileTracingIncludes` mit catch-all-Route `/**/*` zwingt
  //      den Tracer, die kompletten Playwright-Trees in den
  //      standalone-Output zu kopieren (~25 MB extra) — robust gegen
  //      alle Lade-Pfade (PDF-Renderer-Route, generate-document-Action,
  //      Studien-Detail-Seite via Server-Action-Modul-Graph).
  //
  // Siehe DECISIONS.md → "2026-06-01 — Hotfix Pivot-Deploy: Playwright
  // im Next.js Standalone-Output".
  serverExternalPackages: ["playwright", "playwright-core"],
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/playwright-core/**/*", "./node_modules/playwright/**/*"],
  },

  experimental: {
    // Hotfix — image uploads moved from `POST /api/uploads` (Route
    // Handler) to a Server Action because production nginx returned
    // 502 specifically on the multipart Route Handler path while
    // forwarding Server Actions correctly. The default Server Action
    // bodySizeLimit is 1 MB; SPEC §4.6 allows images up to 10 MB. We
    // budget 15 MB to cover 10 MB payload + multipart-encoding
    // overhead. See DECISIONS.md → "Hotfix: Upload via Server Action
    // statt Route Handler".
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
