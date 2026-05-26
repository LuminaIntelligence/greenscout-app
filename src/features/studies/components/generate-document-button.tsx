"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { generateDocumentAction } from "@/features/studies/actions/generate-document";
import { t, type TranslationKey } from "@/i18n/de";

interface Props {
  studyId: string;
  disabled?: boolean;
}

const ERROR_KEY: Record<string, TranslationKey> = {
  validation: "studies.document.toast.error.validation",
  forbidden: "studies.document.toast.error.forbidden",
  "not-found": "studies.document.toast.error.not-found",
  incomplete: "studies.document.toast.error.incomplete",
  pyservice: "studies.document.toast.error.pyservice",
  server: "studies.document.toast.error.server",
};

export function GenerateDocumentButton({ studyId, disabled = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCalling, setIsCalling] = useState(false);

  const handleClick = () => {
    setIsCalling(true);
    startTransition(async () => {
      const result = await generateDocumentAction({ studyId });
      setIsCalling(false);
      if (result.ok) {
        toast.success(t("studies.document.toast.success"));
        router.refresh();
        return;
      }
      const messageKey = ERROR_KEY[result.errorCode] ?? "studies.document.toast.error.server";
      toast.error(t(messageKey));
    });
  };

  const busy = isPending || isCalling;
  return (
    <Button onClick={handleClick} disabled={disabled || busy}>
      {busy ? t("studies.document.generating") : t("studies.document.generate-button")}
    </Button>
  );
}
