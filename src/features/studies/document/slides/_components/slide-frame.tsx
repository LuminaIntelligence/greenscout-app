import type { ReactNode } from "react";

import { BrandMark } from "./brand-mark";

/**
 * §7.10-Pivot PR 2 — Shared 1920×1080 slide container.
 *
 * Every slide component wraps its content in `<SlideFrame>`. The frame
 * gives:
 *   - exact logical dimensions (1920×1080 = 16:9 landscape) via the
 *     `.slide-frame` utility in `globals.css`;
 *   - an optional slim header band with the slide number badge (top
 *     right) and a body footer with the customer display name + page
 *     marker (bottom);
 *   - consistent left/right inner padding so slides don't all
 *     re-implement gutter spacing.
 *
 * **Pivot-2b PASS 3 (Q13):** Das kleine GreenScout-Brand-Mark (oben rechts
 * auf jeder Slide ab Slide 2 im Original-PDF) ist jetzt Bestandteil des
 * Frames. Slide 1 (Cover) opt-outet via `showBrandMark={false}` weil es
 * seinen eigenen Hero-Wordmark zentral plaziert.
 *
 * The `data-slide-number` attribute on the root element is consumed by
 * the PR 3 Playwright print route to enforce `page-break-after` between
 * slides during PDF rendering.
 *
 * Server Component — no client hooks, no event handlers. All slides
 * remain server-renderable unless they explicitly need state (e.g.
 * the slide 15 chart, which still doesn't because it's pure SVG).
 */

interface SlideFrameProps {
  slideNumber: number;
  totalSlides?: number;
  customerLabel?: string | null;
  showFooter?: boolean;
  children: ReactNode;
  /** Extra Tailwind classes applied to the inner content wrapper. */
  contentClassName?: string;
  /**
   * Optional override for the outer `.slide-frame` background. Slide 1
   * (Cover) sets this to `bg-forest-green` so the full 1920×1080 canvas
   * is dark-green instead of the default white. Pass `text-white` here as
   * well if the foreground colour needs to flip for the whole frame.
   */
  frameClassName?: string;
  /**
   * Whether the small GreenScout brand-mark (Q13) is rendered in the top
   * right corner. Defaults to `true` so every slide gets it; Slide 1
   * (Cover) opt-outs because it carries its own central Hero wordmark.
   */
  showBrandMark?: boolean;
}

const DEFAULT_TOTAL_SLIDES = 19;

export function SlideFrame({
  slideNumber,
  totalSlides = DEFAULT_TOTAL_SLIDES,
  customerLabel,
  showFooter = true,
  children,
  contentClassName,
  frameClassName,
  showBrandMark = true,
}: SlideFrameProps) {
  return (
    <section
      className={`slide-frame relative ${frameClassName ?? ""}`}
      data-slide-number={slideNumber}
      data-slide-total={totalSlides}
      aria-label={`Slide ${slideNumber} von ${totalSlides}`}
    >
      {showBrandMark ? (
        <BrandMark variant="small" className="absolute right-8 top-8 h-16 w-auto" />
      ) : null}
      <div className={`flex h-full flex-col px-24 py-16 ${contentClassName ?? ""}`}>
        <div className="flex-1">{children}</div>
        {showFooter ? (
          <footer className="slide-footer mt-6 flex items-end justify-between">
            <span>
              {customerLabel ? `${customerLabel} — ` : ""}
              <span className="text-forest-green">Machbarkeitsstudie PV</span>
            </span>
            <span className="tabular-nums">
              {slideNumber.toString().padStart(2, "0")} / {totalSlides}
            </span>
          </footer>
        ) : null}
      </div>
    </section>
  );
}
