import type { Metadata } from "next";

import { t } from "@/i18n/de";

/**
 * §7.10-Pivot PR 4 — Layout für die öffentliche Kunden-Online-Ansicht.
 *
 * Minimal-Pass-Through-Wrapper ohne Topbar / Sidebar / QueryClient /
 * Session-Provider. Das Root-Layout in `src/app/layout.tsx` liefert
 * bereits `<html>` + `<body>` + Gabarito-Fonts; hier kommt nur ein
 * Document-Container + ein knapper Footer hinzu.
 *
 * Warum eigenes Layout statt direkt im Page-Component?
 *   - Klarstellung: **KEIN Auth**, **KEIN Topbar**, **KEIN Tracking** — der
 *     Kunde sieht die Studie ohne GreenScout-Operator-UI um sich herum.
 *   - Trennung gegenüber `(app)/layout.tsx` (Berater-Sicht mit
 *     Topbar+Auth) und gegenüber `internal/render-study/[id]/layout.tsx`
 *     (Playwright-Render-Route, ebenfalls minimal).
 *   - Robots: noindex/nofollow — diese Route soll NICHT in Google-
 *     Index landen, der Token im Query-Param erlaubt sonst Crawler-
 *     induzierte Datenleaks.
 */

export const metadata: Metadata = {
  title: "GreenScout Machbarkeitsstudie",
  // noindex,nofollow — verhindert, dass Suchmaschinen die mit Token
  // gespickte URL indizieren. Defense-in-depth zusätzlich zur Token-
  // Expiry; falls jemand den Link öffentlich teilt, soll er trotzdem
  // nicht über Google auffindbar werden.
  robots: { index: false, follow: false },
};

export default function PublicStudyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="study-document-root flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex-1">{children}</main>
      <footer className="border-t border-muted-lime/40 bg-background py-6 text-center text-xs text-muted-foreground">
        <p className="font-heading">GreenScout</p>
        <p className="mt-1">{t("public-study.footer.copyright")}</p>
      </footer>
    </div>
  );
}
