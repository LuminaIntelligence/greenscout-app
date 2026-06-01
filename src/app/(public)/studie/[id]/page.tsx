import { notFound } from "next/navigation";

import { StudyDocument } from "@/features/studies/document/document";
import { buildStudyDocumentData } from "@/features/studies/document/services/build-document-data";
import { verifyShareToken } from "@/features/studies/document/services/share-token";
import { t } from "@/i18n/de";

import "@/features/studies/document/print.css";

/**
 * §7.10-Pivot PR 4 — Öffentliche Kunden-Online-Ansicht der
 * Machbarkeitsstudie.
 *
 * Pipeline:
 *   1. Berater erzeugt via `createShareLinkAction` einen signierten
 *      HMAC-Token + URL `${APP_URL}/studie/[id]?t=<token>`.
 *   2. Kunde öffnet die URL im Browser. Diese Route validiert den
 *      Token serverseitig:
 *        - kein Token → `notFound()` (404, kein Info-Leak)
 *        - tampered / falsche Signatur → `notFound()`
 *        - malformed → `notFound()`
 *        - expired → eigene Error-Page mit „Sie"-Microcopy
 *        - studyId im Token ≠ Route-Param → `notFound()`
 *   3. Bei valider Token-Verifikation: `buildStudyDocumentData(
 *      payload.organizationId, studyId)` lädt die Studie.
 *   4. `<StudyDocument data={data} />` rendert die 19-Slide-React-
 *      Komponente (gleiche Quelle wie der Playwright-PDF-Render-Pfad
 *      aus PR 3).
 *
 * **Trust-Boundary:** vollständig serverseitig. Der Client erhält
 * gerendetes HTML, KEIN Token-Re-Echo, keine Studien-Daten in einem
 * separat-querybar JSON-Bundle. Token wird nur im Server-Component-Pfad
 * verifiziert und gelangt nicht in den Browser-Bundle.
 *
 * **Sicherheits-Notiz (§7.11 DSGVO):** der Token erlaubt nicht-
 * authentifizierten Zugriff auf Kundendaten. Schutzlinien:
 *   - HMAC-Signature mit `STUDY_SHARE_HMAC_SECRET` (server-only).
 *   - Default-30-Tage-Expiry hardcoded im Token, server-side
 *     verifiziert.
 *   - AuditLog-Eintrag beim Link-Erzeugen (`SHARE_LINK_CREATED`).
 *   - `robots: noindex, nofollow` im Layout (keine Suchmaschinen-
 *     Indexierung).
 *   - Token-Studie-Mismatch → `notFound()` (kein Studien-Hopping per
 *     Token-Wieder­verwendung an anderer URL).
 *
 * @see SPEC.md §4.8 (Online-Ansicht für Kunden)
 * @see DECISIONS.md 2026-06-01 — §7.10-Pivot PR 4
 */

export const dynamic = "force-dynamic";

interface PublicStudyPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
}

export default async function PublicStudyPage({ params, searchParams }: PublicStudyPageProps) {
  const { id: studyId } = await params;
  const search = await searchParams;
  const rawToken = Array.isArray(search.t) ? search.t[0] : search.t;

  if (!rawToken || rawToken.length === 0) {
    notFound();
  }

  const verification = verifyShareToken(rawToken);

  if (!verification.ok) {
    if (verification.reason === "expired") {
      // Sichtbare „Sie"-Microcopy — der Kunde soll wissen, dass der Link
      // abgelaufen ist und er einen neuen anfordern kann.
      return (
        <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
          <h1 className="font-heading text-3xl text-forest-green sm:text-4xl">
            {t("public-study.expired.title")}
          </h1>
          <p className="mt-4 text-base text-foreground sm:text-lg">
            {t("public-study.expired.body")}
          </p>
        </div>
      );
    }
    // invalid / malformed → 404 statt 403 — keine Info-Leakage zur
    // Existenz / Nicht-Existenz des Tokens oder der Studie.
    notFound();
  }

  // Token-`studyId` MUSS mit dem Route-Param matchen. Verhindert das
  // „Token-Hopping"-Szenario: A. Berater stellt Token X für Studie A
  // aus, B. Angreifer probiert den Token für Studie B aus.
  if (verification.payload.studyId !== studyId) {
    notFound();
  }

  const data = await buildStudyDocumentData(verification.payload.organizationId, studyId);
  if (data === null) {
    // Studie gelöscht / nicht (mehr) im Mandanten → 404, keine Info-
    // Leakage darüber, ob die studyId je existiert hat.
    notFound();
  }

  const expiresAt = new Date(verification.payload.exp * 1000).toISOString();

  return (
    <div className="mx-auto max-w-[1920px]">
      <div className="bg-muted-lime/20 px-4 py-2 text-center text-xs text-forest-green">
        {t("public-study.banner.valid-until").replace("{date}", formatDate(expiresAt))}
      </div>
      <StudyDocument data={data} />
    </div>
  );
}
