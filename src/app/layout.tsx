import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

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
