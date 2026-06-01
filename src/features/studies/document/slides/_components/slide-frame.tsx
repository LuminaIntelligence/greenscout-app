import type { ReactNode } from "react";

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
}

const DEFAULT_TOTAL_SLIDES = 19;

export function SlideFrame({
  slideNumber,
  totalSlides = DEFAULT_TOTAL_SLIDES,
  customerLabel,
  showFooter = true,
  children,
  contentClassName,
}: SlideFrameProps) {
  return (
    <section
      className="slide-frame"
      data-slide-number={slideNumber}
      data-slide-total={totalSlides}
      aria-label={`Slide ${slideNumber} von ${totalSlides}`}
    >
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
