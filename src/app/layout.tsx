import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

/**
 * Force every route through dynamic rendering — required for the
 * per-request CSP nonce flow in `src/middleware.ts` to work.
 *
 * Background: Next.js defaults to STATIC rendering when a page's
 * server component doesn't call dynamic functions (headers, cookies,
 * searchParams, etc.). Statically-rendered pages are built ONCE at
 * `next build` time, baked into HTML without nonce attributes on
 * inline scripts, and then served from the cache on every request.
 * The middleware can stamp a fresh nonce on the response CSP header
 * per request — but the HTML body is the cached pre-built version,
 * so the inline script tags lack `nonce="…"` attributes. Browser
 * blocks them; `'strict-dynamic'` then also blocks the chunk scripts
 * (PR #36 production browser confirmation).
 *
 * `force-dynamic` here makes EVERY route render per-request, so
 * Next.js sees the middleware's nonce in the request headers and
 * stamps it onto every inline script it emits.
 *
 * Trade-off accepted: no SSG / ISR for any page. GreenScout is a
 * 1-10-user internal app with per-user data on every screen —
 * caching wasn't a performance lever anyway, and dropping it
 * removes a class of stale-auth-state bugs as a bonus.
 *
 * If a future page genuinely needs static caching (e.g., a public
 * marketing landing without auth), opt in locally on that page's
 * `page.tsx` with `export const dynamic = 'auto'` and verify the
 * CSP nonce flow separately for that route.
 *
 * @see DECISIONS.md → "Hotfix: force-dynamic root layout for CSP nonce stamping (Folge zu PR #35)"
 */
export const dynamic = "force-dynamic";

/**
 * T-002: Gabarito font self-hosted via `next/font/local` (SPEC §8.2). Two
 * weights only — Regular (400) for body, SemiBold (600) for headings. WOFF2
 * with the `latin` subset, which fully covers German diacritics. Each weight
 * is exposed as its own CSS variable so the Tailwind theme (see
 * tailwind.config.ts) and global CSS (see globals.css) can target them
 * independently. `display: 'swap'` avoids FOIT.
 *
 * T-003: `<Toaster />` (sonner) and `<TooltipProvider />` mounted here —
 * production-correct location so any client component can fire `toast.*`
 * or render a tooltip without worrying about provider scope.
 */

const gabaritoBody = localFont({
  src: "../../public/fonts/gabarito-regular.woff2",
  variable: "--font-gabarito-body",
  display: "swap",
  weight: "400",
});

const gabaritoHeading = localFont({
  src: "../../public/fonts/gabarito-semibold.woff2",
  variable: "--font-gabarito-heading",
  display: "swap",
  weight: "600",
});

export const metadata: Metadata = {
  title: "GreenScout",
  description:
    "Interne Anwendung für GreenScout-Berater zur Erstellung von PV-Machbarkeitsstudien.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${gabaritoBody.variable} ${gabaritoHeading.variable}`}>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
