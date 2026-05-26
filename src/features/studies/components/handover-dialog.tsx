"use client";

/**
 * T-030 HandoverDialog — confirmation dialog around the
 * `handoverStudyAction` Server Action.
 *
 * UX flow:
 *   1. Trigger Button "Studie übergeben" sits in the detail-page
 *      action row.
 *   2. Click opens an AlertDialog with an explanatory description
 *      and a native <select> showing all *other* active consultants
 *      (BERATER + ADMIN) in the org. The current owner is filtered
 *      out client-side so the user can't pick themselves.
 *   3. Confirm calls the Server Action; toast surfaces success or
 *      the typed `errorCode`.
 *   4. `router.refresh()` re-runs the Server Component, picking up
 *      the new `consultantId` on next render.
 *
 * Per `canAccessStudy`, the dialog is rendered for both owners and
 * admins. Berater on another consultant's study never see this dialog
 * because the page itself returns `notFound()` for them.
 */

import { Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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
import { Label } from "@/components/ui/label";
import { handoverStudyAction } from "@/features/studies/actions/handover-study";
import { t } from "@/i18n/de";

export interface HandoverConsultantOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "BERATER";
}

export interface HandoverDialogProps {
  studyId: string;
  studyObjectLabel: string;
  currentConsultantId: string;
  consultants: HandoverConsultantOption[];
}

export function HandoverDialog({
  studyId,
  studyObjectLabel,
  currentConsultantId,
  consultants,
}: HandoverDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");

  const candidates = useMemo(
    () => consultants.filter((u) => u.id !== currentConsultantId),
    [consultants, currentConsultantId],
  );

  const description = t("studies.handover.dialog.description").replace(
    "{object}",
    studyObjectLabel,
  );

  function formatName(u: HandoverConsultantOption): string {
    const fullName = [u.firstName, u.lastName]
      .filter((s) => s.length > 0)
      .join(" ")
      .trim();
    const display = fullName.length > 0 ? fullName : u.email;
    return u.role === "ADMIN" ? `${display} (Admin)` : display;
  }

  function handleConfirm() {
    if (selectedId.length === 0) {
      toast.error(t("studies.handover.toast.error.target-required"));
      return;
    }
    startTransition(async () => {
      const result = await handoverStudyAction({
        studyId,
        newConsultantId: selectedId,
      });
      if (result.ok) {
        toast.success(t("studies.handover.toast.success"));
        setOpen(false);
        setSelectedId("");
        router.refresh();
        return;
      }
      const errKey: Parameters<typeof t>[0] =
        result.errorCode === "not-found"
          ? "studies.handover.toast.error.not-found"
          : result.errorCode === "forbidden"
            ? "studies.handover.toast.error.forbidden"
            : result.errorCode === "target-not-found"
              ? "studies.handover.toast.error.target-not-found"
              : result.errorCode === "target-not-eligible"
                ? "studies.handover.toast.error.target-not-eligible"
                : result.errorCode === "validation"
                  ? "studies.handover.toast.error.validation"
                  : "studies.handover.toast.error.server";
      toast.error(t(errKey));
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSelectedId("");
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={candidates.length === 0}>
          <Users className="size-4" />
          {t("studies.handover.action")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("studies.handover.dialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="handover-target">{t("studies.handover.field.target")}</Label>
          <select
            id="handover-target"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={isPending}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{t("studies.handover.field.target.placeholder")}</option>
            {candidates.map((u) => (
              <option key={u.id} value={u.id}>
                {formatName(u)}
              </option>
            ))}
          </select>
          {candidates.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("studies.handover.empty.no-candidates")}
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("studies.handover.dialog.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
            disabled={isPending || selectedId.length === 0}
          >
            {t("studies.handover.dialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
