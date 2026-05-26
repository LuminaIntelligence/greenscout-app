import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { countStudies, listStudies } from "@/lib/repositories/study.repository";

/**
 * T-028 studies list JSON API consumed by the `StudiesTable`
 * client component via TanStack Query. Read-only, auth-gated.
 *
 * Filters: `?page=N&status=DRAFT|READY|GENERATED`. Berater see
 * only own studies; admin sees all (F7).
 */

const PAGE_SIZE = 25;

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const rawStatus = url.searchParams.get("status") ?? "";
  const status: "DRAFT" | "READY" | "GENERATED" | undefined =
    rawStatus === "DRAFT" || rawStatus === "READY" || rawStatus === "GENERATED"
      ? rawStatus
      : undefined;

  const isAdmin = session.user.role === "ADMIN";
  const consultantFilter = isAdmin ? undefined : session.user.id;

  const [studies, total] = await Promise.all([
    listStudies(session.user.organizationId, {
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      includeRelations: true,
      consultantId: consultantFilter,
      status,
    }),
    countStudies(session.user.organizationId, {
      consultantId: consultantFilter,
      status,
    }),
  ]);

  return NextResponse.json({
    studies: studies.map((s) => ({
      id: s.id,
      objectName: s.objectName,
      customerLabel:
        s.customer.companyName ?? `${s.customer.contactFirstName} ${s.customer.contactLastName}`,
      consultantLabel: `${s.consultant.firstName} ${s.consultant.lastName}`,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    total,
  });
}
