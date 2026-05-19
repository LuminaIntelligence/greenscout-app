import { SETUP_PHASE } from "@/lib/example";
import { FEATURE_PLACEHOLDER } from "@/features/example";
import { COMPONENT_PLACEHOLDER } from "@/components/example";
import type { SetupPhase } from "@/types/example";

// T-002 placeholder page. The four `@/`-alias imports above still exercise
// every path alias declared in `tsconfig.json` (T-001 contract). The visible
// markup now uses Tailwind utilities backed by the GreenScout colour tokens
// (SPEC §8.1 / CLAUDE.md §9) and Gabarito font variables wired in layout.tsx,
// so the page doubles as a smoke test that tokens + font load correctly.

export default function Home() {
  const phase: SetupPhase = "T-002";
  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4 p-12">
      <h1 className="text-forest-green font-heading text-4xl">GreenScout</h1>
      <p className="font-sans text-base">
        Phase {phase}: {SETUP_PHASE} — Design tokens live.
      </p>
      <p className="text-sm opacity-60">
        {FEATURE_PLACEHOLDER} · {COMPONENT_PLACEHOLDER}
      </p>
      <div className="mt-4 flex gap-2">
        <span className="bg-forest-green rounded px-3 py-1 text-sm text-white">
          forest-green
        </span>
        <span className="bg-plant-green rounded px-3 py-1 text-sm text-white">
          plant-green
        </span>
        <span className="bg-muted-lime text-foreground rounded px-3 py-1 text-sm">
          muted-lime
        </span>
        <a
          className="border-link text-link rounded border px-3 py-1 text-sm"
          href="#"
        >
          link colour
        </a>
      </div>
      <p className="tabular-nums mt-4 text-sm">
        1.234,56 € — 27.500 € — 100 ha
      </p>
    </main>
  );
}
