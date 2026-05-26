import { redirect } from "next/navigation";

import { NewStudyButton } from "@/features/studies/components/new-study-button";
import { StudiesTable, type StudyRow } from "@/features/studies/components/studies-table";
import { t } from "@/i18n/de";
import { auth } from "@/lib/auth";
import { countStudies, listStudies } from "@/lib/repositories/study.repository";

/**
 * T-028 `/studies` dashboard.
 *
 * Server Component — performs the initial paginated fetch with
 * the consultant + customer joined-in, hands off to the client
 * `StudiesTable`. The Berater sees only their own studies; admin
 * sees all studies (F7 god-mode).
 *
 * URL state holds `?page=N&status=DRAFT|READY|GENERATED` for refresh
 * + share-link safety.
 */

const PAGE_SIZE = 25;

export const metadata = {
  title: "Studien — GreenScout",
  description: "Übersicht aller GreenScout-Machbarkeitsstudien.",
};

interface PageProps {
  searchParams: Promise<{ page?: string; status?: string }>;
}

export const dynamic = "force-dynamic";

export default async function StudiesPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1"));
  const rawStatus = params.status ?? "";
  // Narrow to the union literal so downstream `repoFilters.status`
  // is `StudyStatus | undefined` (the repo's `CountStudiesOptions`
  // expects exactly that, not a generic string).
  const status: "" | "DRAFT" | "READY" | "GENERATED" =
    rawStatus === "DRAFT" || rawStatus === "READY" || rawStatus === "GENERATED" ? rawStatus : "";

  const isAdmin = session.user.role === "ADMIN";
  const consultantFilter = isAdmin ? undefined : session.user.id;

  // `status` is narrowed to the union literal earlier; the empty
  // string becomes `undefined` so the repo's `if (options.status)`
  // skips the filter. We pass exactly `StudyStatus | undefined`.
  const statusFilter: "DRAFT" | "READY" | "GENERATED" | undefined =
    status === "" ? undefined : status;

  const [studies, total] = await Promise.all([
    listStudies(session.user.organizationId, {
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      includeRelations: true,
      consultantId: consultantFilter,
      status: statusFilter,
    }),
    countStudies(session.user.organizationId, {
      consultantId: consultantFilter,
      status: statusFilter,
    }),
  ]);

  const initialData = {
    studies: studies.map<StudyRow>((s) => ({
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
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-forest-green">{t("studies.page.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("studies.page.subtitle")}</p>
        </div>
        <NewStudyButton />
      </div>
      <StudiesTable
        initialData={initialData}
        initialPage={page}
        initialStatus={status}
        showConsultantColumn={isAdmin}
      />
    </div>
  );
}
