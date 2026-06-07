/**
 * §7.10-Pivot PR 2 — Shared image slot used by Slide 5 (BEFORE / AFTER)
 * and the title page (consultant signature).
 *
 * Wraps a fixed aspect-ratio container with `<img>` + `object-cover`.
 * `src === null` → renders a Brand-Lime-outlined placeholder card with
 * a label, ODER (Pivot-2c A2) das PPTX-Default-Asset, das vom Caller via
 * `fallbackSrc` mitgegeben wird. Der Default-Fallback wird genutzt, wenn
 * die Studie noch keine eigenen BEFORE/AFTER-Bilder hat — so zeigt das
 * Dokument trotzdem die Original-PPTX-Motive (Roof-Fotos) und keine
 * gestrichelten Platzhalter. Berater-Uploads überschreiben den Fallback.
 *
 * Uses plain `<img>` rather than `next/image` because the renderer is
 * read by Playwright's headless Chromium in PR 3, which doesn't go
 * through the Next.js Image-Optimizer pipeline anyway, and the public
 * online view in PR 4 wants direct URLs without optimization roundtrips.
 */

interface ImageSlotProps {
  src: string | null;
  alt: string;
  emptyLabel: string;
  /** Tailwind aspect-ratio class, e.g. `aspect-[16/9]`. */
  aspectClassName?: string;
  /** Tailwind className for additional container styling. */
  className?: string;
  /**
   * Pivot-2c A2 — Default-PPTX-Asset, das gerendert wird, wenn `src === null`.
   * Wenn weder `src` noch `fallbackSrc` gesetzt sind, fällt der Slot auf die
   * gestrichelte Empty-State-Card mit `emptyLabel` zurück.
   */
  fallbackSrc?: string;
}

export function ImageSlot({
  src,
  alt,
  emptyLabel,
  aspectClassName = "aspect-[16/9]",
  className,
  fallbackSrc,
}: ImageSlotProps) {
  const containerClass = `relative overflow-hidden rounded-lg ${aspectClassName} ${className ?? ""}`;

  const effectiveSrc = src ?? fallbackSrc ?? null;

  if (effectiveSrc === null) {
    return (
      <div
        className={`${containerClass} flex items-center justify-center border-4 border-dashed border-muted-lime-400 bg-muted-lime-50`}
        role="img"
        aria-label={emptyLabel}
      >
        <span className="slide-body text-forest-green opacity-70">{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={effectiveSrc} alt={alt} className="h-full w-full object-cover" />
    </div>
  );
}
