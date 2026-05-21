import { Card, CardContent } from "@/components/ui/card";
import { CustomerForm } from "@/features/customers/components/customer-form";
import { t } from "@/i18n/de";

/**
 * T-023 `/customers/new` — create-new-customer page.
 *
 * Server Component (auth-gated by the `(app)` layout). Renders the
 * shared `CustomerForm` in `create` mode inside a max-w-2xl Card.
 *
 * Heading + subtitle use the design-token tokens (`font-heading`,
 * `text-forest-green`) per CLAUDE.md §9.
 *
 * @see DECISIONS.md → "T-023 silent decisions per §14 (consolidated)"
 */

export const metadata = {
  title: "Neuer Kunde — GreenScout",
};

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-forest-green">{t("customers.page.new.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("customers.page.new.subtitle")}</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <CustomerForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
