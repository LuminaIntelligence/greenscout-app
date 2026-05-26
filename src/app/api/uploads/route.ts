/**
 * T-029a Image upload route handler.
 *
 * POST `/api/uploads`
 *   `multipart/form-data` with fields:
 *     - `file` — the image binary (required)
 *     - `kind` — `BEFORE` | `AFTER` (required)
 *     - `studyId` — uuid/cuid of the parent Study (required)
 *
 * Returns:
 *   - `200 { ok: true, image: { id, kind, url, widthPx, heightPx } }`
 *   - `400` validation / size / format / corrupt
 *   - `401` no session
 *   - `403` not your study
 *   - `404` study not found
 *   - `415` unsupported MIME type
 *   - `500` server / pyservice failure
 *
 * All branching logic lives in
 * `src/features/studies/services/upload-image.ts` (100% unit coverage);
 * this route handler is the HTTP shim — auth + FormData decode + status
 * mapping. The `src/app/**` tree is excluded from the unit-coverage gate
 * (Playwright covers it end-to-end per T-051a/b).
 */

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { processStudyImageUpload } from "@/features/studies/services/upload-image";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_KINDS = new Set(["BEFORE", "AFTER"] as const);

function errorResponse(errorCode: string, status: number, detail?: string): NextResponse {
  return NextResponse.json({ ok: false, errorCode, ...(detail ? { detail } : {}) }, { status });
}

const ERROR_STATUS: Record<string, number> = {
  validation: 400,
  forbidden: 403,
  "not-found": 404,
  "file-too-large": 400,
  "unsupported-format": 415,
  "corrupt-image": 400,
  "dimensions-too-large": 400,
  "magic-bytes-mismatch": 400,
  pyservice: 502,
  server: 500,
};

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return errorResponse("unauthorized", 401);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse("validation", 400, "Failed to parse multipart body");
  }

  const file = form.get("file");
  const kindRaw = form.get("kind");
  const studyId = form.get("studyId");

  if (!(file instanceof File)) {
    return errorResponse("validation", 400, "missing file field");
  }
  if (typeof kindRaw !== "string" || !ALLOWED_KINDS.has(kindRaw as "BEFORE" | "AFTER")) {
    return errorResponse("validation", 400, "kind must be BEFORE or AFTER");
  }
  if (typeof studyId !== "string" || studyId.length === 0) {
    return errorResponse("validation", 400, "missing studyId");
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
    kind: kindRaw as "BEFORE" | "AFTER",
    originalFilename: file.name,
    declaredMimeType: file.type,
    bytes,
    ipAddress,
    userAgent,
  });

  if (!result.ok) {
    const status = ERROR_STATUS[result.errorCode] ?? 500;
    return errorResponse(result.errorCode, status, result.message);
  }

  return NextResponse.json({
    ok: true,
    image: {
      id: result.image.id,
      kind: result.image.kind,
      url: `/api/uploads/${result.image.id}`,
      widthPx: result.image.widthPx,
      heightPx: result.image.heightPx,
      mimeType: result.image.mimeType,
      wasReplacement: result.image.wasReplacement,
    },
  });
}
