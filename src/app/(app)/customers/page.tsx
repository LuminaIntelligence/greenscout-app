import { redirect } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CustomerTable } from "@/features/customers/components/customer-table";
import { t } from "@/i18n/de";
import { auth } from "@/lib/auth";
import { countCustomers, listCustomers } from "@/lib/repositories/customer.repository";

/**
 * T-022 `/customers` list page.
 *
 * Server Component — performs the initial paginated fetch via the
 * repository layer and hands the result to the client `CustomerTable`
 * via `initialData`. Subsequent navigation (filter, pagination) is
 * driven by TanStack Query against `/api/customers`.
 *
 * Auth is enforced by middleware + the `(app)` layout's `auth()`
 * check; the defensive guard below catches edge cases where Next.js
 * renders the page outside the layout chain.
 *
 * Search and page state live in the URL (`?page=N&search=…`) so
 * refresh + share-link both work.
 *
 * The empty-state CTA ("Neuer Kunde") points at `/customers/new`,
 * which currently 404s — implemented in T-023.
 *
 * @see DECISIONS.md → "T-022 silent decisions per §14 (consolidated)"
 */

const PAGE_SIZE = 25;

export const metadata = {
  title: "Kunden — GreenScout",
  description: "Liste aller GreenScout-Kunden mit Anzahl der angelegten Machbarkeitsstudien.",
};

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1"));
  const search = params.search ?? "";

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

  const initialData = {
    customers: customers.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      contactFirstName: c.contactFirstName,
      contactLastName: c.contactLastName,
      billingCity: c.billingCity,
      studyCount: c._count.studies,
    })),
    total,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-forest-green">{t("customers.page.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("customers.page.subtitle")}</p>
        </div>
        <Button asChild className="bg-plant-green text-white hover:bg-plant-green/90">
          <Link href="/customers/new">{t("customers.action.new")}</Link>
        </Button>
      </div>

      <CustomerTable initialData={initialData} initialPage={page} initialSearch={search} />
    </div>
  );
}
