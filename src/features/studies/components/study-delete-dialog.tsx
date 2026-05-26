"use client";

/**
 * T-028 StudyDeleteDialog — confirmation dialog around the soft-
 * delete-study Server Action. Mirrors `CustomerDeleteDialog`.
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
import { softDeleteStudyAction } from "@/features/studies/actions/soft-delete-study";
import { t } from "@/i18n/de";

export interface StudyDeleteDialogProps {
  studyId: string;
  studyObjectLabel: string;
  size?: "sm" | "default";
}

export function StudyDeleteDialog({
  studyId,
  studyObjectLabel,
  size = "default",
}: StudyDeleteDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const description = t("studies.delete.dialog.description").replace("{object}", studyObjectLabel);

  function handleConfirm() {
    const fd = new FormData();
    fd.set("studyId", studyId);
    startTransition(async () => {
      const result = await softDeleteStudyAction(fd);
      if (result.ok) {
        toast.success(t("studies.toast.deleted"));
        setOpen(false);
        router.refresh();
        return;
      }
      const errKey =
        result.errorCode === "not-found"
          ? "studies.delete.toast.error.not-found"
          : "studies.delete.toast.error.server";
      toast.error(t(errKey));
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size={size}>
          <Trash2 className="size-4" />
          {t("studies.action.delete")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("studies.delete.dialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("studies.delete.dialog.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
            disabled={isPending}
            className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
          >
            {t("studies.delete.dialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
