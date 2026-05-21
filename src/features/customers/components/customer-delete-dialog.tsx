"use client";

/**
 * T-024 CustomerDeleteDialog — confirmation dialog around the
 * soft-delete-customer Server Action.
 *
 * Client component wrapping shadcn `AlertDialog`. The detail page
 * (`src/app/(app)/customers/[id]/page.tsx`) renders this in the
 * page footer and passes the customer id + label. Behaviour:
 *
 *   - Trigger renders a destructive-variant button with the German
 *     "Löschen" label.
 *   - On Confirm: builds a FormData payload, calls
 *     `softDeleteCustomerAction(formData)` inside `useTransition`.
 *   - Success → sonner success toast ("{company} wurde gelöscht."),
 *     `router.refresh()` + `router.push("/customers")`. The dialog
 *     unmounts with the page so no explicit close is needed.
 *   - Error → sonner error toast keyed on `errorCode`. The dialog
 *     stays open so the user can retry or cancel.
 *
 * The `<Toaster />` is mounted at the root `app/layout.tsx` (T-003)
 * so no provider wiring is needed here.
 *
 * @see DECISIONS.md → "T-024 silent decisions per §14 (consolidated)"
 */

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { softDeleteCustomerAction } from "@/features/customers/actions/soft-delete-customer";
import { t } from "@/i18n/de";

export interface CustomerDeleteDialogProps {
  customerId: string;
  customerCompanyName: string;
}

export function CustomerDeleteDialog({
  customerId,
  customerCompanyName,
}: CustomerDeleteDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  // Compose user-facing copy. `{company}` is a literal marker in the
  // i18n dictionary (see `customers.delete.dialog.description` +
  // `customers.delete.toast.success`); replace it here so the dialog
  // and toast both surface the live customer label.
  const description = t("customers.delete.dialog.description").replace(
    "{company}",
    customerCompanyName,
  );
  const successMessage = t("customers.delete.toast.success").replace(
    "{company}",
    customerCompanyName,
  );

  function handleConfirm() {
    const formData = new FormData();
    formData.set("customerId", customerId);

    startTransition(async () => {
      const result = await softDeleteCustomerAction(formData);

      if (result.ok) {
        toast.success(successMessage);
        setOpen(false);
        router.refresh();
        router.push("/customers");
        return;
      }

      const errorKey =
        result.errorCode === "not-found"
          ? "customers.delete.toast.error.not-found"
          : "customers.delete.toast.error.server";
      toast.error(t(errorKey));
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="size-4" />
          {t("customers.detail.action.delete")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("customers.delete.dialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("customers.delete.dialog.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              // Block AlertDialog's default close-on-click so we control
              // the lifecycle: dialog stays open on error, closes after
              // the success toast fires.
              event.preventDefault();
              handleConfirm();
            }}
            disabled={isPending}
            className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
          >
            {t("customers.delete.dialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
