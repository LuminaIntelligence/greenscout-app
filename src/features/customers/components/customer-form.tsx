"use client";

/**
 * T-023 CustomerForm — client component shared between
 * `/customers/new` (mode="create") and `/customers/[id]/edit`
 * (mode="edit"). RHF + zod resolver, three section-grouped fields,
 * Server Action submission, sonner toast for success/error.
 *
 * Field grouping (SPEC §4.4 / §5.1):
 *   1. Firma — companyName
 *   2. Kontakt — contactFirstName, contactLastName, email, phone
 *   3. Rechnungsadresse — billingAddress, ZIP + city (1/3+2/3 grid), notes
 *
 * Mode-specific behaviour:
 *   - create → calls createCustomerAction, toasts "Kunde angelegt",
 *     navigates to /customers (T-024 will introduce a detail page).
 *   - edit → calls updateCustomerAction(customerId, ...), toasts
 *     "Änderungen gespeichert", navigates to /customers.
 *
 * Error handling:
 *   - errorCode "validation" → maps fieldErrors to RHF `form.setError`
 *     (each `messageKey` resolves through `t()`).
 *   - errorCode "not-found" / "forbidden" / "server" → red toast.
 *
 * No optimistic UI — `router.refresh()` + `router.push("/customers")`
 * relies on `revalidatePath("/customers")` from the Server Action so
 * the list view sees fresh data on next render. This avoids
 * optimistic-rollback complexity for a CRUD pattern that doesn't need
 * sub-second response masking.
 *
 * @see DECISIONS.md → "T-023 silent decisions per §14 (consolidated)"
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { createCustomerAction } from "@/features/customers/actions/create-customer";
import { updateCustomerAction } from "@/features/customers/actions/update-customer";
import { customerSchema, type CustomerInput } from "@/features/customers/schemas/customer-schema";
import { t, type TranslationKey } from "@/i18n/de";

export interface CustomerFormInitialData {
  companyName?: string;
  contactFirstName?: string;
  contactLastName?: string;
  email?: string;
  phone?: string;
  billingAddress?: string;
  billingZipCode?: string;
  billingCity?: string;
  notes?: string;
}

type CustomerFormProps =
  | { mode: "create"; customerId?: undefined; initialData?: CustomerFormInitialData }
  | { mode: "edit"; customerId: string; initialData: CustomerFormInitialData };

const EMPTY_DEFAULTS: CustomerInput = {
  contactFirstName: "",
  contactLastName: "",
};

function isTranslationKey(key: string): key is TranslationKey {
  // Field-error keys returned by the Server Action are produced by the
  // shared zod schema in this feature, so we know every value matches
  // one of the `customers.error.*` keys defined in `src/i18n/de.ts`.
  // The type predicate keeps `t()`'s compile-time exhaustiveness from
  // erroring on the dynamic dispatch.
  return key.startsWith("customers.error.") || key.startsWith("auth.error.");
}

export function CustomerForm(props: CustomerFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      ...EMPTY_DEFAULTS,
      ...props.initialData,
      contactFirstName: props.initialData?.contactFirstName ?? EMPTY_DEFAULTS.contactFirstName,
      contactLastName: props.initialData?.contactLastName ?? EMPTY_DEFAULTS.contactLastName,
    },
  });

  function onSubmit(values: CustomerInput) {
    startTransition(async () => {
      const result =
        props.mode === "create"
          ? await createCustomerAction(values)
          : await updateCustomerAction(props.customerId, values);

      if (result.ok) {
        toast.success(
          props.mode === "create" ? t("customers.toast.created") : t("customers.toast.updated"),
        );
        router.refresh();
        router.push("/customers");
        return;
      }

      if (result.errorCode === "validation" && result.fieldErrors) {
        for (const [field, messageKey] of Object.entries(result.fieldErrors)) {
          const message = isTranslationKey(messageKey) ? t(messageKey) : messageKey;
          form.setError(field as keyof CustomerInput, {
            type: "server",
            message,
          });
        }
        return;
      }

      const errorKey: TranslationKey =
        result.errorCode === "not-found"
          ? "customers.error.not-found"
          : result.errorCode === "forbidden"
            ? "customers.error.forbidden"
            : "customers.error.server";
      toast.error(t(errorKey));
    });
  }

  const submitLabel = isPending
    ? t("customers.action.saving")
    : props.mode === "create"
      ? t("customers.action.create")
      : t("customers.action.save");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Firma */}
        <section className="space-y-4">
          <h2 className="font-heading text-lg text-forest-green">
            {t("customers.section.company")}
          </h2>
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("customers.field.company-name")}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <Separator />

        {/* Kontakt */}
        <section className="space-y-4">
          <h2 className="font-heading text-lg text-forest-green">
            {t("customers.section.contact")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="contactFirstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("customers.field.first-name")}</FormLabel>
                  <FormControl>
                    <Input required {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactLastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("customers.field.last-name")}</FormLabel>
                  <FormControl>
                    <Input required {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("customers.field.email")}</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("customers.field.phone")}</FormLabel>
                  <FormControl>
                    <Input type="tel" autoComplete="tel" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <Separator />

        {/* Rechnungsadresse */}
        <section className="space-y-4">
          <h2 className="font-heading text-lg text-forest-green">
            {t("customers.section.billing")}
          </h2>
          <FormField
            control={form.control}
            name="billingAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("customers.field.billing-address")}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="billingZipCode"
              render={({ field }) => (
                <FormItem className="sm:col-span-1">
                  <FormLabel>{t("customers.field.billing-zip")}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="billingCity"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>{t("customers.field.billing-city")}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("customers.field.notes")}</FormLabel>
                <FormControl>
                  <Textarea rows={4} {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/customers")}
            disabled={isPending}
          >
            {t("customers.action.cancel")}
          </Button>
          <Button
            type="submit"
            className="bg-plant-green text-white hover:bg-plant-green/90"
            disabled={isPending}
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
