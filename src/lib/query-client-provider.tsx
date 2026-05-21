"use client";

/**
 * TanStack Query v5 provider used by the authenticated `(app)` route
 * group (T-022 §14.2-silent decision).
 *
 * The `QueryClient` is constructed inside `useState` so a fresh client
 * is created per-app-mount (avoids the cross-request state bleeding
 * that a module-scoped client would suffer in the Next.js App Router).
 *
 * Defaults chosen for the GreenScout MVP:
 *   - `staleTime: 30s` — list/detail views feel "fresh" but a click
 *     into a detail page will background-refetch when stale.
 *   - `gcTime: 5min` — keeps the table cached during quick nav for
 *     instant-back UX.
 *   - `refetchOnWindowFocus: false` — consultants frequently tab between
 *     this app, a PowerPoint, and Outlook. Auto-refetch on every focus
 *     would feel jittery.
 *
 * @see DECISIONS.md → "T-022 silent decisions per §14 (consolidated)"
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function AppQueryClientProvider({ children }: Props) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
