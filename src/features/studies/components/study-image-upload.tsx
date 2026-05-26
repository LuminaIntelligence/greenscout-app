"use client";

/**
 * T-029a — Single-slot image-upload widget for the Step-7 wizard
 * section.
 *
 * One instance per slot (`BEFORE` / `AFTER`). Drag-and-drop or
 * click-to-select. Calls `/api/uploads` with a multipart body; on
 * success calls back the parent with the freshly stored image's
 * metadata so the wizard can update its local state.
 *
 * Failure-mode mapping: the route handler returns a typed
 * `errorCode`; this component translates it into a German toast via
 * `src/i18n/de.ts`. Unknown codes fall back to a generic server toast.
 *
 * @see SPEC.md §4.6
 */

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { t, type TranslationKey } from "@/i18n/de";

export interface UploadedImageInfo {
  id: string;
  kind: "BEFORE" | "AFTER";
  url: string;
  widthPx: number;
  heightPx: number;
  mimeType: string;
}

export interface StudyImageUploadProps {
  studyId: string;
  kind: "BEFORE" | "AFTER";
  currentImage: UploadedImageInfo | null;
  onUploaded: (image: UploadedImageInfo) => void;
  disabled?: boolean;
}

const ALLOWED_MIME = "image/jpeg,image/png,image/webp";

const ERROR_CODE_TO_KEY: Record<string, TranslationKey> = {
  "file-too-large": "studies.error.upload.file-too-large",
  "unsupported-format": "studies.error.upload.unsupported-format",
  "magic-bytes-mismatch": "studies.error.upload.unsupported-format",
  "corrupt-image": "studies.error.upload.corrupt-image",
  "dimensions-too-large": "studies.error.upload.dimensions-too-large",
  "not-found": "studies.error.upload.not-found",
  forbidden: "studies.error.upload.forbidden",
  unauthorized: "studies.error.upload.forbidden",
  validation: "studies.error.upload.validation",
  pyservice: "studies.error.upload.server",
  server: "studies.error.upload.server",
};

interface ApiUploadResponse {
  ok?: boolean;
  errorCode?: string;
  image?: {
    id: string;
    kind: "BEFORE" | "AFTER";
    url: string;
    widthPx: number;
    heightPx: number;
    mimeType: string;
  };
}

export function StudyImageUpload({
  studyId,
  kind,
  currentImage,
  onUploaded,
  disabled = false,
}: StudyImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const labelKey: TranslationKey =
    kind === "BEFORE" ? "studies.field.bild-before" : "studies.field.bild-after";

  function openFilePicker() {
    inputRef.current?.click();
  }

  async function performUpload(file: File): Promise<void> {
    if (disabled || isUploading) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);
    formData.append("studyId", studyId);

    setIsUploading(true);
    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const json = (await response.json().catch(() => ({}))) as ApiUploadResponse;
      if (!response.ok || json.ok !== true || !json.image) {
        const code = json.errorCode ?? "server";
        const key = ERROR_CODE_TO_KEY[code] ?? "studies.error.upload.server";
        toast.error(t(key));
        return;
      }
      toast.success(t("studies.toast.image-uploaded"));
      onUploaded(json.image);
    } catch {
      toast.error(t("studies.error.upload.server"));
    } finally {
      setIsUploading(false);
      // Reset the hidden input so selecting the same file twice still
      // triggers `onChange`. The ref is attached for the entire
      // lifetime of the rendered component, so the non-null assertion
      // matches runtime invariants.
      const input = inputRef.current!;
      input.value = "";
    }
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void performUpload(file);
  }

  function onDragEnter(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) setIsDragging(true);
  }

  function onDragLeave(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function onDragOver(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    e.stopPropagation();
  }

  function onDrop(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void performUpload(file);
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">{t(labelKey)}</div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_MIME}
        className="sr-only"
        onChange={onFileChange}
        disabled={disabled || isUploading}
        data-testid={`upload-file-input-${kind.toLowerCase()}`}
      />

      {currentImage !== null ? (
        <div
          className={
            "flex flex-col items-stretch gap-2 rounded border " +
            (isDragging
              ? "border-plant-green bg-muted-lime/30"
              : "border-muted-foreground/30 bg-muted/20")
          }
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentImage.url}
            alt={t(labelKey)}
            className="aspect-video max-h-48 w-full rounded-t object-contain"
          />
          <div className="flex items-center justify-between px-3 pb-2 text-xs text-muted-foreground">
            <span>
              {currentImage.widthPx}×{currentImage.heightPx} · {currentImage.mimeType}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openFilePicker}
              disabled={disabled || isUploading}
            >
              {isUploading
                ? t("studies.action.upload-uploading")
                : t("studies.action.upload-replace")}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openFilePicker}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          disabled={disabled || isUploading}
          className={
            "flex h-40 w-full flex-col items-center justify-center gap-2 rounded border-2 border-dashed text-sm transition-colors " +
            (isDragging
              ? "border-plant-green bg-muted-lime/30 text-forest-green"
              : "border-muted-foreground/40 bg-muted/30 text-muted-foreground hover:border-plant-green/60") +
            (disabled || isUploading ? " cursor-not-allowed opacity-60" : " cursor-pointer")
          }
          data-testid={`upload-dropzone-${kind.toLowerCase()}`}
        >
          {isUploading ? (
            <span>{t("studies.action.upload-uploading")}</span>
          ) : (
            <>
              <span>{t("studies.hint.upload-dropzone-headline")}</span>
              <span className="text-xs">{t("studies.hint.upload-dropzone-detail")}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
