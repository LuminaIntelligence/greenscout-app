"use client";

/**
 * T-028 NewStudyButton — opens a dialog that picks the customer for
 * a new study, runs `createStudyAction`, and navigates to the freshly-
 * created study's edit page (where the user's `formPreference` decides
 * wizard vs single-page rendering).
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { createStudyAction } from "@/features/studies/actions/create-study";
import { CustomerSelect } from "@/features/studies/components/customer-select";
import { t, type TranslationKey } from "@/i18n/de";

export function NewStudyButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    if (!customerId) {
      setError(t("studies.error.customer-required"));
      return;
    }
    startTransition(async () => {
      const result = await createStudyAction({ customerId });
      if (result.ok) {
        toast.success(t("studies.toast.created"));
        setOpen(false);
        router.push(`/studies/${result.studyId}/edit`);
        return;
      }
      const errKey: TranslationKey =
        result.errorCode === "validation"
          ? "studies.error.customer-required"
          : result.errorCode === "forbidden"
            ? "studies.error.forbidden"
            : "studies.error.server";
      toast.error(t(errKey));
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-plant-green text-white hover:bg-plant-green/90">
          {t("studies.action.new")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("studies.page.new.title")}</DialogTitle>
          <DialogDescription>{t("studies.page.new.subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label htmlFor="new-study-customer">{t("studies.field.customer")}</Label>
          <CustomerSelect
            value={customerId}
            onChange={(next) => {
              setCustomerId(next);
              setError(null);
            }}
            disabled={isPending}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            {t("studies.action.cancel")}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isPending}
            className="bg-plant-green text-white hover:bg-plant-green/90"
          >
            {isPending ? t("studies.action.saving") : t("studies.action.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
