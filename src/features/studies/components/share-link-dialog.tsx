"use client";

/**
 * §7.10-Pivot PR 4 — ShareLinkDialog für die Kunden-Online-Ansicht.
 *
 * UX-Flow (Berater-intern, „Du"-Form):
 *   1. Trigger-Button "Online-Link erzeugen" steht neben "Dokument
 *      generieren" auf der Studie-Detail-Seite.
 *   2. Klick ruft `createShareLinkAction({ studyId })` auf und öffnet
 *      einen AlertDialog mit:
 *        - Erklärungstext (Kundensicht, „Sie"-Form Hinweis)
 *        - Read-Only Input mit der generierten URL
 *        - „In Zwischenablage kopieren"-Button
 *        - „Gültig bis <Datum>"-Hinweis
 *   3. Bei Fehler: Toast mit typed errorCode → de.ts-Microcopy.
 *
 * **Default-TTL: 30 Tage** (siehe `DEFAULT_SHARE_TOKEN_TTL_DAYS`). Für
 * MVP keine UI zum Custom-TTL-Setzen — KISS; pro Bedarf via Action-Param
 * `expiresInDays` nachrüstbar.
 *
 * **Confirmation**: Wir zeigen den Link in einem Modal. Berater sieht
 * den Link, kann ihn kopieren, der Dialog schließt sich beim "Schließen"-
 * Klick. Keine "wirklich öffentlich machen?"-Bestätigung in MVP (KISS).
 */

import { Link2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createShareLinkAction,
  type CreateShareLinkResult,
} from "@/features/studies/actions/create-share-link";
import { t, type TranslationKey } from "@/i18n/de";

export interface ShareLinkDialogProps {
  studyId: string;
}

const ERROR_KEY: Record<string, TranslationKey> = {
  validation: "studies.share.toast.error.validation",
  forbidden: "studies.share.toast.error.forbidden",
  "not-found": "studies.share.toast.error.not-found",
  server: "studies.share.toast.error.server",
};

function formatGermanDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
}

export function ShareLinkDialog({ studyId }: ShareLinkDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [linkInfo, setLinkInfo] = useState<{ url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const triggerShare = () => {
    startTransition(async () => {
      const result: CreateShareLinkResult = await createShareLinkAction({ studyId });
      if (result.ok) {
        setLinkInfo({ url: result.url, expiresAt: result.expiresAt });
        setCopied(false);
        setOpen(true);
        toast.success(t("studies.share.toast.success"));
        return;
      }
      const messageKey = ERROR_KEY[result.errorCode] ?? "studies.share.toast.error.server";
      toast.error(t(messageKey));
    });
  };

  const handleCopy = async () => {
    if (!linkInfo) return;
    try {
      await navigator.clipboard.writeText(linkInfo.url);
      setCopied(true);
      toast.success(t("studies.share.toast.copied"));
    } catch {
      // Falls Clipboard-API nicht verfügbar (HTTP / sehr alter Browser),
      // markiert der User den Link manuell. Kein Hard-Fail nötig.
      toast.error(t("studies.share.toast.error.server"));
    }
  };

  const handleClose = () => {
    setOpen(false);
    setLinkInfo(null);
    setCopied(false);
  };

  return (
    <>
      <Button variant="outline" onClick={triggerShare} disabled={isPending}>
        <Link2 className="mr-2 h-4 w-4" />
        {isPending ? t("studies.share.action.creating") : t("studies.share.action.create")}
      </Button>

      <AlertDialog open={open} onOpenChange={(next) => (next ? setOpen(true) : handleClose())}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("studies.share.dialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("studies.share.dialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>

          {linkInfo && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="share-link-url" className="text-xs text-muted-foreground">
                  {t("studies.share.dialog.url-label")}
                </Label>
                <Input
                  id="share-link-url"
                  type="text"
                  value={linkInfo.url}
                  readOnly
                  onFocus={(e) => e.currentTarget.select()}
                  className="font-mono text-xs"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("studies.share.dialog.expires-at").replace(
                  "{date}",
                  formatGermanDate(linkInfo.expiresAt),
                )}
              </p>
              <Button type="button" onClick={handleCopy} variant="secondary" className="w-full">
                {copied ? t("studies.share.dialog.copied") : t("studies.share.dialog.copy")}
              </Button>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogAction onClick={handleClose}>
              {t("studies.share.dialog.close")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
