import { SETUP_PHASE } from "@/lib/example";
import { FEATURE_PLACEHOLDER } from "@/features/example";
import { COMPONENT_PLACEHOLDER } from "@/components/example";
import type { SetupPhase } from "@/types/example";

// T-001 placeholder page. Subsequent tasks (T-002 Tailwind, T-003 shadcn/ui,
// T-005 auth flow, etc.) will replace this with the real application shell.
// The four imports above intentionally exercise every path alias declared in
// `tsconfig.json` so that `tsc --noEmit` and `next build` prove the alias map
// resolves end-to-end. See CLAUDE.md §4.3.

export default function Home() {
  const phase: SetupPhase = "T-001";
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>GreenScout — Setup in progress</h1>
      <p>
        Phase {phase}: {SETUP_PHASE}.
      </p>
      <p style={{ fontSize: "0.875rem", opacity: 0.6 }}>
        {FEATURE_PLACEHOLDER} · {COMPONENT_PLACEHOLDER}
      </p>
    </main>
  );
}
