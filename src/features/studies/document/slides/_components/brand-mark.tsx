/**
 * Pivot-2b PASS 3 — BrandMark.
 *
 * Q13 (User-Direktive 2026-06-03): „Das Logo ist als embedded Image im
 * PPTX-Archiv vorhanden — Gabarito-Text als Substitut ist Marken-
 * Identitäts-Verlust." Diese Komponente rendert das aus dem PPTX
 * extrahierte Original-Logo. Verwendet auf Slide 1 (Hero-Variante,
 * `wordmark`) und überall sonst wo das Original-PDF das kleine
 * Brand-Mark oben rechts zeigt (`small`).
 *
 * Sourcing: `scripts/extract-template-images.py` → `public/assets/`.
 * Die genutzten Bilder sind:
 *   - `greenscout-logo-hero.png` (Slide 1 Wide Wordmark, 2993×501)
 *   - `greenscout-brand-mark.png` (kleines Brand-Mark, 963×1180, 17×
 *     identisch im PPTX-Original verstreut auf Slides 3-19)
 *
 * Server Component — kein Client-Bundle.
 */

type BrandMarkVariant = "wordmark" | "small";

interface BrandMarkProps {
  variant: BrandMarkVariant;
  /** Tailwind classes for size/positioning. Required so callers control layout. */
  className?: string;
  /** Image alt — defaults to a generic „GreenScout e.V." label. */
  alt?: string;
}

export function BrandMark({ variant, className, alt = "GreenScout e.V." }: BrandMarkProps) {
  const src =
    variant === "wordmark"
      ? "/assets/greenscout-logo-hero.png"
      : "/assets/greenscout-brand-mark.png";
  // Plain <img> (not next/image) so the slide renders identically inside
  // Playwright's headless print pipeline without intercepting the request
  // for optimisation — public/assets/ is the canonical PPTX-blob mirror.
  // `data-brand-mark` lets slide tests count only content images while
  // ignoring brand-mark chrome (see slides.test.tsx Slide05VorherNachher).
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} data-brand-mark={variant} />
  );
}
