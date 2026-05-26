// Extends Vitest's `expect` with @testing-library/jest-dom matchers
// (`toBeInTheDocument`, `toHaveTextContent`, `toHaveAttribute`, …) for
// React-component tests. Loaded once at the start of every Vitest run
// via `setupFiles` in vitest.config.ts.

import "@testing-library/jest-dom/vitest";

// jsdom does not implement `ResizeObserver` (Radix UI primitives
// `react-use-size` consume it). Stub a no-op so RadioGroup / Select /
// Dialog primitives mount without exploding. Real layout sizes are
// irrelevant to unit tests; we only assert against React-tree output.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
