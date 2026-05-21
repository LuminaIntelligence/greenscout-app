import { notFound, redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import {
  CustomerForm,
  type CustomerFormInitialData,
} from "@/features/customers/components/customer-form";
import { t } from "@/i18n/de";
import { auth } from "@/lib/auth";
import { findCustomerById } from "@/lib/repositories/customer.repository";

/**
 * T-023 `/customers/[id]/edit` — edit-customer page.
 *
 * Server Component. Auth-gated by the `(app)` layout plus a defensive
 * `auth()` check here. Looks up the customer through the repository
 * layer (org-scoped) — if the row is absent or the `organizationId`
 * doesn't match the session's, surfaces a 404 via `notFound()`
 * instead of leaking existence information.
 *
 * Pre-fills the shared `CustomerForm` (mode="edit") from the loaded row,
 * mapping nullable DB columns to optional form-input strings.
 *
 * @see DECISIONS.md → "T-023 silent decisions per §14 (consolidated)"
 */

export const metadata = {
  title: "Kunde bearbeiten — GreenScout",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCustomerPage({ params }: PageProps) {
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
  // filters by `{ id, organizationId }` so this guard is redundant in
  // the single-tenant MVP — but keep it so a future cross-tenant data
  // bug surfaces as a 404 rather than a leak.
  if (customer.organizationId !== session.user.organizationId) {
    notFound();
  }

  const initialData: CustomerFormInitialData = {
    companyName: customer.companyName ?? undefined,
    contactFirstName: customer.contactFirstName,
    contactLastName: customer.contactLastName,
    email: customer.email ?? undefined,
    phone: customer.phone ?? undefined,
    billingAddress: customer.billingAddress ?? undefined,
    billingZipCode: customer.billingZipCode ?? undefined,
    billingCity: customer.billingCity ?? undefined,
    notes: customer.notes ?? undefined,
  };

  const displayName =
    customer.companyName ?? `${customer.contactFirstName} ${customer.contactLastName}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-forest-green">
          {t("customers.page.edit.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{displayName}</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <CustomerForm mode="edit" customerId={customer.id} initialData={initialData} />
        </CardContent>
      </Card>
    </div>
  );
}
