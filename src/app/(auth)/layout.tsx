import type { Metadata } from "next";

/**
 * T-018 (auth) route-group layout.
 *
 * Centered viewport for unauthenticated screens (currently `/login`).
 * The brand logo block sits above the page-rendered Card so the visual
 * hierarchy reads Brand → Form-function (per DECISIONS T-018 design ⑥).
 *
 * Logo is text-only "GreenScout" in `font-heading text-3xl text-forest-green`
 * — no Lucide glyph (would be non-brand). Real SVG arrives in T-048b.
 */

export const metadata: Metadata = {
  title: "Anmeldung — GreenScout",
  description: "Melde dich bei GreenScout an, um Machbarkeitsstudien zu erstellen.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <main className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl text-forest-green">GreenScout</h1>
        </div>
        {children}
      </main>
    </div>
  );
}
