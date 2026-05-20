// Extends Vitest's `expect` with @testing-library/jest-dom matchers
// (`toBeInTheDocument`, `toHaveTextContent`, `toHaveAttribute`, …) for
// React-component tests. Loaded once at the start of every Vitest run
// via `setupFiles` in vitest.config.ts.

import "@testing-library/jest-dom/vitest";
