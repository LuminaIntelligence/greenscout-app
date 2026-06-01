import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { StudyDocument } from "@/features/studies/document/document";
import { buildStudyDocumentData } from "@/features/studies/document/services/build-document-data";

import "@/features/studies/document/print.css";

/**
 * §7.10-Pivot PR 3 — interne Render-Route für den Playwright-PDF-Renderer.
 *
 * Wie der Pipeline-Flow funktioniert:
 *
 *   1. `generateDocumentAction` ruft `renderStudyToPdf(studyId)` auf
 *      (`src/features/studies/document/services/render-pdf.ts`).
 *   2. `renderStudyToPdf` startet Headless Chromium und navigiert zu
 *      dieser Route (`/internal/render-study/<id>`), wobei der Header
 *      `x-internal-render-token` mit `INTERNAL_RENDER_TOKEN` gesetzt ist.
 *   3. Diese Route prüft den Token-Header → bei Mismatch `notFound()`
 *      (Standard-404, keine Info-Leakage).
 *   4. Bei Match: lädt `buildStudyDocumentData(orgId, studyId)` aus der
 *      DB, rendert `<StudyDocument data={data} />` (alle 19 Slides
 *      untereinander).
 *   5. Playwright wartet auf `document.fonts.ready` + `networkidle` und
 *      ruft `page.pdf()`.
 *
 * **Sicherheits-Notiz (§7.3 analoges Pattern):** Token-Gate ist ein
 * Service-zu-Service Shared-Secret analog `PYTHON_SERVICE_API_KEY`
 * (T-035). KEIN User-Auth-Flow. Die Middleware whitelistet den Pfad
 * (`isPublicPath`), damit der headless Chromium ohne Session-Cookie
 * navigieren kann; der Token-Gate hier ersetzt die Session-Auth.
 *
 * **Nicht öffentlich auffindbar:** kein Sitemap-Eintrag, keine Navigation,
 * keine Verlinkung im Topbar. Operator-Workflow: niemand sieht diese
 * Route außer dem internen Playwright-Browser.
 *
 * **organizationId:** in MVP-Single-Tenant ist das `"greenscout"`-Default
 * (siehe SPEC §5.3). PR 4 wird das aus dem signed HMAC-Token holen; hier
 * reicht der Default.
 */

export const dynamic = "force-dynamic";

const ORG_ID = "greenscout";

export default async function InternalRenderStudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const expectedToken = process.env.INTERNAL_RENDER_TOKEN;
  if (!expectedToken || expectedToken.length === 0) {
    // Hard-fail Server-Side: wenn die env-Variable nicht gesetzt ist,
    // ist die Render-Pipeline kaputt — dann 404, damit niemand
    // versehentlich ohne Token rein-routen kann.
    console.error("[internal/render-study] INTERNAL_RENDER_TOKEN not configured");
    notFound();
  }

  const headerList = await headers();
  const presentedToken = headerList.get("x-internal-render-token");
  if (presentedToken !== expectedToken) {
    // 404 statt 403 — niemand soll die Existenz dieser Route via Status-
    // Code-Probing erraten können.
    notFound();
  }

  const { id: studyId } = await params;
  const data = await buildStudyDocumentData(ORG_ID, studyId);
  if (data === null) {
    notFound();
  }

  return <StudyDocument data={data} />;
}
