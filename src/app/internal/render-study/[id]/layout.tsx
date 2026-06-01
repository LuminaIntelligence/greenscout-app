/**
 * §7.10-Pivot PR 3 — Layout für die interne Playwright-Render-Route.
 *
 * Bewusst NUR ein Pass-Through-Wrapper ohne Topbar, ohne Sidebar, ohne
 * QueryClient-Provider. Das Root-Layout in `src/app/layout.tsx` liefert
 * bereits `<html>` + `<body>` + Gabarito-Fonts; hier kommt nichts hinzu
 * außer dem `study-document-root`-Container, damit der `print.css`-Selector
 * `.slide-frame` greift.
 *
 * Warum eigenes Layout statt direkt im Page-Component?
 *   - Klarstellung: KEINE Auth, KEIN Topbar, KEIN Tracking — das ist eine
 *     Render-Pipeline-Route, kein User-UI.
 *   - Trennung gegenüber `(app)/layout.tsx`, das die Topbar + Auth bringt.
 *   - Future-Proof: falls PR 4 (HMAC-Public-Online-Ansicht) ähnliche
 *     Render-Anforderungen hat, kann dieses Pattern hier kopiert werden.
 */
export default function InternalRenderStudyLayout({ children }: { children: React.ReactNode }) {
  return <div className="study-document-root">{children}</div>;
}
