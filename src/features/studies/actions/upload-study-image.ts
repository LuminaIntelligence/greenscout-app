"use server";

/**
 * Hotfix — image-upload as a Server Action instead of a Route Handler.
 *
 * **Why this exists.** Production nginx (Hetzner VPS) returns 502 for
 * `POST /api/uploads` (multipart/form-data) while the very same nginx
 * happily forwards every other `POST` — including Server Actions that
 * also carry FormData payloads. After several rounds of remote
 * debugging the root cause could not be isolated, so we move the
 * browser-facing entry point to a Server Action: same FormData, same
 * service code, same trust boundary — but it traverses the Server
 * Action pipeline (`POST /studies/[id]/edit` URL pattern) which nginx
 * already treats correctly.
 *
 * **Service code unchanged.** All branching logic continues to live in
 * `src/features/studies/services/upload-image.ts` (100% unit coverage
 * via the per-pattern threshold). This Server Action is the
 * FormData → service adapter, mirroring exactly what the Route Handler
 * at `src/app/api/uploads/route.ts` does today. The Route Handler is
 * kept in place for future API consumers (mobile app, etc.) — the
 * browser path simply no longer touches it.
 *
 * @see DECISIONS.md → "Hotfix: Upload via Server Action statt Route Handler"
 * @see SPEC.md §4.6 (image upload contract)
 */

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { processStudyImageUpload } from "@/features/studies/services/upload-image";
import { auth } from "@/lib/auth";

export type UploadStudyImageResult =
  | {
      ok: true;
      image: {
        id: string;
        kind: "BEFORE" | "AFTER";
        url: string;
        widthPx: number;
        heightPx: number;
        fileSizeBytes: number;
        mimeType: string;
        wasReplacement: boolean;
      };
    }
  | {
      ok: false;
      errorCode:
        | "validation"
        | "forbidden"
        | "not-found"
        | "unauthorized"
        | "file-too-large"
        | "unsupported-format"
        | "corrupt-image"
        | "dimensions-too-large"
        | "magic-bytes-mismatch"
        | "pyservice"
        | "server";
      message?: string;
    };

export async function uploadStudyImageAction(formData: FormData): Promise<UploadStudyImageResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, errorCode: "unauthorized" };
  }

  const file = formData.get("file");
  const kindRaw = formData.get("kind");
  const studyId = formData.get("studyId");

  if (!(file instanceof File)) {
    return { ok: false, errorCode: "validation", message: "missing file" };
  }
  if (kindRaw !== "BEFORE" && kindRaw !== "AFTER") {
    return { ok: false, errorCode: "validation", message: "kind must be BEFORE or AFTER" };
  }
  if (typeof studyId !== "string" || studyId.length === 0) {
    return { ok: false, errorCode: "validation", message: "missing studyId" };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  const headerList = await headers();
  const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent") ?? null;

  const result = await processStudyImageUpload({
    userId: session.user.id,
    organizationId: session.user.organizationId,
    userRole: session.user.role === "ADMIN" ? "ADMIN" : "BERATER",
    studyId,
    kind: kindRaw,
    originalFilename: file.name,
    declaredMimeType: file.type,
    bytes,
    ipAddress,
    userAgent,
  });

  if (!result.ok) {
    return { ok: false, errorCode: result.errorCode, message: result.message };
  }

  // Re-render so the image preview surfaces on the next paint.
  revalidatePath(`/studies/${studyId}/edit`);
  revalidatePath(`/studies/${studyId}`);

  return {
    ok: true,
    image: {
      id: result.image.id,
      kind: result.image.kind,
      url: `/api/uploads/${result.image.id}`,
      widthPx: result.image.widthPx,
      heightPx: result.image.heightPx,
      fileSizeBytes: result.image.fileSizeBytes,
      mimeType: result.image.mimeType,
      wasReplacement: result.image.wasReplacement,
    },
  };
}
