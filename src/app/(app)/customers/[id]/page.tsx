import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CustomerDeleteDialog } from "@/features/customers/components/customer-delete-dialog";
import { t } from "@/i18n/de";
import { auth } from "@/lib/auth";
import { findCustomerById } from "@/lib/repositories/customer.repository";

/**
 * T-024 `/customers/[id]` — read-only customer detail page.
 *
 * Server Component. Auth-gated by the `(app)` layout plus a defensive
 * `auth()` check here. Looks up the customer through the repository
 * layer (org-scoped) — if the row is absent, the `organizationId`
 * doesn't match the session's, or the row is soft-deleted, surfaces
 * a 404 via `notFound()` instead of leaking existence information.
 *
 * Sections rendered:
 *   - "Firma" (companyName, fallback "—")
 *   - "Kontakt" (firstName + lastName, email, phone)
 *   - "Rechnungsadresse" (billingAddress + ZIP + city)
 *   - "Verknüpfte Studien" — empty-state until T-028 lands a studies
 *     repo + route. TODO marker below.
 *
 * Footer-row carries "Bearbeiten" (Link to /edit) and the
 * `<CustomerDeleteDialog>` (client component wrapping the
 * soft-delete Server Action).
 *
 * @see DECISIONS.md → "T-024 silent decisions per §14 (consolidated)"
 */

export const metadata = {
  title: "Kundendetails — GreenScout",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const customer = await findCustomerById(session.user.organizationId, id);
  if (customer === null) {
    notFound();
  }

  // Multi-tenant safety: belt-and-braces. `findCustomerById` already
  // filters by `{ id, organizationId, deletedAt: null }` so this guard
  // is redundant in single-tenant MVP — but keep it so a future
  // cross-tenant data bug surfaces as a 404 rather than a leak. The
  // soft-delete defence is covered by the repository's default filter
  // (a row with `deletedAt !== null` returns as null from `findCustomerById`).
  if (customer.organizationId !== session.user.organizationId) {
    notFound();
  }

  const displayName =
    customer.companyName ?? `${customer.contactFirstName} ${customer.contactLastName}`;
  const emptyMark = t("customers.detail.field.empty");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-forest-green">{displayName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("customers.detail.title")}</p>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          {/* Firma */}
          <section className="space-y-2">
            <h2 className="font-heading text-lg text-forest-green">
              {t("customers.detail.section.company")}
            </h2>
            <DetailRow
              label={t("customers.field.company-name")}
              value={customer.companyName}
              empty={emptyMark}
            />
          </section>

          <Separator />

          {/* Kontakt */}
          <section className="space-y-2">
            <h2 className="font-heading text-lg text-forest-green">
              {t("customers.detail.section.contact")}
            </h2>
            <DetailRow
              label={t("customers.field.first-name")}
              value={customer.contactFirstName}
              empty={emptyMark}
            />
            <DetailRow
              label={t("customers.field.last-name")}
              value={customer.contactLastName}
              empty={emptyMark}
            />
            <DetailRow
              label={t("customers.field.email")}
              value={customer.email}
              empty={emptyMark}
            />
            <DetailRow
              label={t("customers.field.phone")}
              value={customer.phone}
              empty={emptyMark}
            />
          </section>

          <Separator />

          {/* Rechnungsadresse */}
          <section className="space-y-2">
            <h2 className="font-heading text-lg text-forest-green">
              {t("customers.detail.section.billing")}
            </h2>
            <DetailRow
              label={t("customers.field.billing-address")}
              value={customer.billingAddress}
              empty={emptyMark}
            />
            <DetailRow
              label={t("customers.field.billing-zip")}
              value={customer.billingZipCode}
              empty={emptyMark}
            />
            <DetailRow
              label={t("customers.field.billing-city")}
              value={customer.billingCity}
              empty={emptyMark}
            />
          </section>

          <Separator />

          {/* Verknüpfte Studien — empty-state until Slice 5 lands. */}
          <section className="space-y-2">
            <h2 className="font-heading text-lg text-forest-green">
              {t("customers.detail.section.studies")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("customers.detail.studies.empty")}</p>
            {/* TODO(claude): liste anbinden sobald T-028 (Studies-Dashboard) Repo + Route bereitstellt. */}
          </section>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline">
          <Link href={`/customers/${customer.id}/edit`}>
            <Pencil className="size-4" />
            {t("customers.detail.action.edit")}
          </Link>
        </Button>
        <CustomerDeleteDialog customerId={customer.id} customerCompanyName={displayName} />
      </div>
    </div>
  );
}

interface DetailRowProps {
  label: string;
  value: string | null;
  empty: string;
}

function DetailRow({ label, value, empty }: DetailRowProps) {
  return (
    <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-[200px_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value && value.length > 0 ? value : empty}</dd>
    </div>
  );
}
