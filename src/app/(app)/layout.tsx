import { redirect } from "next/navigation";

import { Topbar } from "@/features/app-shell/components/topbar";
import { auth } from "@/lib/auth";
import { AppQueryClientProvider } from "@/lib/query-client-provider";

/**
 * T-022 `(app)` route-group layout — wraps every authenticated business
 * page (Kunden, future Studien, future Admin) with:
 *
 *   - `AppQueryClientProvider` so client components can use TanStack
 *     Query without re-mounting a `QueryClient` per page.
 *   - `Topbar` showing logo + nav + user dropdown.
 *
 * Auth is enforced primarily by `src/middleware.ts` (which redirects
 * unauthenticated requests to `/login`). The defensive `auth()` check
 * + `redirect("/login")` here is a belt-and-braces guard: route-group
 * layouts also render for prefetched RSCs and direct `next/dynamic`
 * pulls, so the layout must NOT assume the middleware ran.
 *
 * @see DECISIONS.md → "T-022 silent decisions per §14 (consolidated)"
 */

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <AppQueryClientProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <Topbar userEmail={session.user.email} userRole={session.user.role} />
        <main className="container mx-auto flex-1 p-6">{children}</main>
      </div>
    </AppQueryClientProvider>
  );
}
