"use client";

/**
 * T-041a TempPasswordDialog — one-time-shown modal that surfaces the
 * server-generated temp password to the admin after a successful
 * `createUserAction`.
 *
 * The password lives only in the React state of this component for
 * the lifetime of the dialog. Once the admin closes it, the value
 * cannot be retrieved again — they must do an admin password reset
 * (T-041b) if it was lost.
 */

import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n/de";

export interface TempPasswordDialogProps {
  open: boolean;
  tempPassword: string;
  /**
   * Called when the admin acknowledges the dialog. Typically the
   * page-level handler navigates back to `/users`.
   */
  onClose: () => void;
}

export function TempPasswordDialog({ open, tempPassword, onClose }: TempPasswordDialogProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      // Reset the "copied" indicator after a short visual confirmation.
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API requires a secure context; on http://localhost
      // it usually works, but if it doesn't the admin can still select
      // + copy the text manually from the monospace block.
      setCopied(false);
    }
  }

  function handleClose() {
    onClose();
    router.refresh();
    router.push("/users");
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("users.temp-password.dialog.title")}</DialogTitle>
          <DialogDescription>{t("users.temp-password.dialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border bg-muted p-4">
          <code
            data-testid="temp-password-value"
            className="select-all break-all font-mono text-base text-foreground"
          >
            {tempPassword}
          </code>
        </div>

        <DialogFooter className="flex-row items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="size-4" />
                {t("users.temp-password.action.copied")}
              </>
            ) : (
              <>
                <Copy className="size-4" />
                {t("users.temp-password.action.copy")}
              </>
            )}
          </Button>
          <Button type="button" onClick={handleClose}>
            {t("users.temp-password.action.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
