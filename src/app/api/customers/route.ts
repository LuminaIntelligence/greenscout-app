import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { countCustomers, listCustomers } from "@/lib/repositories/customer.repository";

/**
 * T-022 customer list JSON API.
 *
 * GET-only endpoint consumed by the `CustomerTable` client component
 * via TanStack Query. Read-only — no CSRF surface. Auth-gated by
 * `auth()` (returns 401 if no session).
 *
 * Response shape mirrors `CustomerListResult` in the table component:
 *   `{ customers: CustomerRow[]; total: number }`
 *
 * `take` is fixed at the server-side `PAGE_SIZE = 25`; clients control
 * pagination via the `?page=N` query parameter (1-indexed). Search
 * is forwarded to the repository, which filters by
 * `contactLastName` OR `companyName` ILIKE.
 *
 * Mutations (create/update/delete) live in T-023 / T-024 Server
 * Actions, NOT in this route.
 *
 * @see DECISIONS.md → "T-022 silent decisions per §14 (consolidated)"
 */

const PAGE_SIZE = 25;

export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const search = url.searchParams.get("search") ?? "";

  const [customers, total] = await Promise.all([
    listCustomers(session.user.organizationId, {
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      search: search || undefined,
      includeStudyCount: true,
    }),
    countCustomers(session.user.organizationId, {
      search: search || undefined,
    }),
  ]);

  return NextResponse.json({
    customers: customers.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      contactFirstName: c.contactFirstName,
      contactLastName: c.contactLastName,
      billingCity: c.billingCity,
      studyCount: c._count.studies,
    })),
    total,
  });
}
