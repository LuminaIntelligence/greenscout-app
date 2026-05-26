"use client";

/**
 * T-041a UserDeactivateDialog — AlertDialog around the
 * `deactivateUserAction` Server Action.
 */

import { UserX } from "lucide-react";
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
import { deactivateUserAction } from "@/features/users/actions/deactivate-user";
import { t } from "@/i18n/de";

export interface UserDeactivateDialogProps {
  userId: string;
  userDisplayName: string;
}

export function UserDeactivateDialog({ userId, userDisplayName }: UserDeactivateDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const description = t("users.deactivate.dialog.description").replace("{name}", userDisplayName);

  function handleConfirm() {
    startTransition(async () => {
      const result = await deactivateUserAction({ userId });
      if (result.ok) {
        toast.success(t("users.toast.deactivated"));
        setOpen(false);
        router.refresh();
        return;
      }
      const errKey =
        result.errorCode === "not-found"
          ? "users.error.not-found"
          : result.errorCode === "self-deactivate"
            ? "users.error.self-deactivate"
            : result.errorCode === "forbidden"
              ? "users.error.forbidden"
              : "users.error.server";
      toast.error(t(errKey));
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserX className="size-4" />
          {t("users.action.deactivate")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("users.deactivate.dialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("users.deactivate.dialog.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
            disabled={isPending}
            className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
          >
            {t("users.deactivate.dialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
