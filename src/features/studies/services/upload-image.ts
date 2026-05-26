/**
 * T-029a — Image-upload service for Slice 4.
 *
 * Trust boundary between the route handler at
 * `src/app/api/uploads/route.ts` and:
 *
 *   - the `Study` + `StudyImage` repositories (multi-tenant /
 *     ownership-checked),
 *   - the Python service (`callProcessImage`) for format detection +
 *     optional in-place resize,
 *   - the `AuditLog` repository (one `IMAGE_UPLOADED` /
 *     `IMAGE_REPLACED` entry per successful upload).
 *
 * Why a separate module from the route handler?
 * `src/app/**` is excluded from the unit-coverage gate (see
 * vitest.config.ts → "T-024b coverage gate honesty"), so all of the
 * branching logic lives here where the per-pattern 100% threshold
 * applies. The route handler only converts `Request` ↔ HTTP plumbing
 * around this function.
 *
 * @see SPEC.md §4.6 (image upload contract)
 * @see DECISIONS.md → "Slice 4 — Image Upload"
 */

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";

import { callProcessImage } from "@/lib/python-service-client";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { findStudyById } from "@/lib/repositories/study.repository";
import { findStudyImage, upsertStudyImage } from "@/lib/repositories/study-image.repository";

/**
 * Mirror of Prisma's `ImageType` enum so this module doesn't pull the
 * generated client (ESLint `no-restricted-imports` keeps direct Prisma
 * access in the repository layer). The string union matches the
 * `@@unique([studyId, type])` enum exactly; the repository accepts
 * the matching type at runtime.
 */
type ImageType = "BEFORE" | "AFTER";

/** Inputs to `processStudyImageUpload`. */
export interface UploadImageInput {
  /** Authenticated caller's session id (FK to `User`). */
  userId: string;
  /** Authenticated caller's organisation scope. */
  organizationId: string;
  /** `BERATER` only owns their own studies; `ADMIN` god-mode allowed. */
  userRole: "BERATER" | "ADMIN";
  studyId: string;
  kind: ImageType;
  /** Original filename from the client; used only as input to `extensionOf`. */
  originalFilename: string;
  /** MIME type as reported by the client (re-checked via magic-bytes). */
  declaredMimeType: string;
  /** Full file bytes. */
  bytes: Uint8Array;
  /** Optional headers passed through to the audit-log entry. */
  ipAddress: string | null;
  userAgent: string | null;
}

/** Output of `processStudyImageUpload`. */
export type UploadImageResult =
  | {
      ok: true;
      image: {
        id: string;
        kind: ImageType;
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
        | "file-too-large"
        | "unsupported-format"
        | "corrupt-image"
        | "dimensions-too-large"
        | "magic-bytes-mismatch"
        | "pyservice"
        | "server";
      message?: string;
    };

/** Allowed MIME types per SPEC §4.6. */
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Maps Pillow's MIME response → the file extension we persist on disk. */
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Default upload-size cap; can be overridden via env var. */
const DEFAULT_MAX_UPLOAD_MB = 10;

/** Default dimension cap; can be overridden via env var. */
const DEFAULT_MAX_DIMENSION_PX = 4000;

/** Magic-bytes signatures for the three whitelisted formats. */
const MAGIC_BYTES: Array<{ mime: string; signature: number[]; offset: number }> = [
  // JPEG: FF D8 FF
  { mime: "image/jpeg", signature: [0xff, 0xd8, 0xff], offset: 0 },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  { mime: "image/png", signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0 },
  // WEBP: "RIFF...WEBP" -> bytes 0..3 = R,I,F,F and bytes 8..11 = W,E,B,P
  { mime: "image/webp", signature: [0x52, 0x49, 0x46, 0x46], offset: 0 },
];

/**
 * Sniff the leading bytes of the file and return the inferred MIME type
 * or `null` if no whitelist signature matches.
 *
 * Defence-in-depth — a client claiming `image/jpeg` while uploading a
 * disguised `.exe` is rejected before we touch disk.
 */
export function sniffMimeType(bytes: Uint8Array): string | null {
  for (const probe of MAGIC_BYTES) {
    const slice = bytes.subarray(probe.offset, probe.offset + probe.signature.length);
    if (slice.length < probe.signature.length) continue;
    let match = true;
    for (let i = 0; i < probe.signature.length; i++) {
      if (slice[i] !== probe.signature[i]) {
        match = false;
        break;
      }
    }
    if (!match) continue;
    // WebP has the "WEBP" marker at offset 8; check it too.
    if (probe.mime === "image/webp") {
      if (bytes.length < 12) continue;
      const webpMarker = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
      let webpOk = true;
      for (let i = 0; i < webpMarker.length; i++) {
        if (bytes[8 + i] !== webpMarker[i]) {
          webpOk = false;
          break;
        }
      }
      if (!webpOk) continue;
    }
    return probe.mime;
  }
  return null;
}

/** Read and validate the `MAX_UPLOAD_MB` env. Falls back to the default if missing / invalid. */
export function resolveMaxUploadBytes(): number {
  const raw = process.env.MAX_UPLOAD_MB;
  const parsed = raw === undefined ? NaN : Number.parseFloat(raw);
  const mb = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_UPLOAD_MB;
  return Math.floor(mb * 1024 * 1024);
}

/** Read and validate the `MAX_IMAGE_DIMENSION_PX` env. Falls back to the default. */
export function resolveMaxImageDimensionPx(): number {
  const raw = process.env.MAX_IMAGE_DIMENSION_PX;
  const parsed = raw === undefined ? NaN : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_DIMENSION_PX;
}

/** Resolve the configured uploads root, defaulting to `./uploads` (dev). */
export function resolveUploadsRoot(): string {
  return resolvePath(process.env.UPLOADS_DIR ?? "./uploads");
}

/**
 * Compose the on-disk path for a new upload.
 *
 * Layout: `<UPLOADS_DIR>/studies/<studyId>/<kind-lower>-<uuid>.<ext>`.
 * Multi-tenant safe because `studyId` ownership is verified before we
 * touch disk.
 */
export function buildStoragePath(
  uploadsRoot: string,
  studyId: string,
  kind: ImageType,
  extension: string,
): string {
  const id = randomUUID();
  const filename = `${kind.toLowerCase()}-${id}.${extension}`;
  return resolvePath(uploadsRoot, "studies", studyId, filename);
}

/**
 * Heavy-lifting service that the upload route handler delegates to.
 *
 * Flow:
 *   1. Session-bound studyId ownership check (forbidden / not-found).
 *   2. Size check.
 *   3. Magic-bytes MIME sniff vs. declared MIME.
 *   4. Write file to `UPLOADS_DIR/studies/<studyId>/`.
 *   5. Ask Python service to validate + optionally resize.
 *   6. Upsert `StudyImage` row.
 *   7. Audit-log entry.
 *
 * On failure after step 4, the partially-written file is deleted
 * before returning the error so the volume doesn't accumulate orphans.
 */
export async function processStudyImageUpload(input: UploadImageInput): Promise<UploadImageResult> {
  if (!ALLOWED_MIME_TYPES.has(input.declaredMimeType)) {
    return {
      ok: false,
      errorCode: "unsupported-format",
      message: input.declaredMimeType,
    };
  }
  if (input.bytes.length === 0) {
    return { ok: false, errorCode: "validation", message: "empty body" };
  }

  const maxBytes = resolveMaxUploadBytes();
  if (input.bytes.length > maxBytes) {
    return { ok: false, errorCode: "file-too-large", message: String(maxBytes) };
  }

  const sniffed = sniffMimeType(input.bytes);
  if (sniffed === null) {
    return { ok: false, errorCode: "magic-bytes-mismatch" };
  }
  if (sniffed !== input.declaredMimeType) {
    return { ok: false, errorCode: "magic-bytes-mismatch", message: sniffed };
  }

  const study = await findStudyById(input.organizationId, input.studyId);
  if (study === null) {
    return { ok: false, errorCode: "not-found" };
  }
  if (input.userRole !== "ADMIN" && study.consultantId !== input.userId) {
    return { ok: false, errorCode: "forbidden" };
  }

  const uploadsRoot = resolveUploadsRoot();
  // `sniffed` is guaranteed to be one of the three whitelist MIMEs by
  // the magic-bytes check above, so the lookup never falls through.
  const extension = MIME_TO_EXTENSION[sniffed] as string;
  const storagePath = buildStoragePath(uploadsRoot, input.studyId, input.kind, extension);

  try {
    await mkdir(resolvePath(storagePath, ".."), { recursive: true });
    await writeFile(storagePath, input.bytes);
  } catch (err) {
    console.error("[upload-image] write failed", err);
    return { ok: false, errorCode: "server" };
  }

  // Hand off to the Python service for format validation + optional resize.
  const pyResult = await callProcessImage({
    imagePath: storagePath,
    maxDimensionPx: resolveMaxImageDimensionPx(),
  });

  if (!pyResult.ok) {
    await unlink(storagePath).catch(() => undefined);
    if (pyResult.kind === "validation") {
      return { ok: false, errorCode: "unsupported-format", message: pyResult.message };
    }
    if (pyResult.kind === "bad-request") {
      // The Python side rejects path-traversal / file-missing as 400/404.
      return { ok: false, errorCode: "corrupt-image", message: pyResult.message };
    }
    return { ok: false, errorCode: "pyservice", message: pyResult.message };
  }

  // Even though we cap upload bytes, an oversize PNG can resolve to
  // huge dimensions inside the byte budget. The Python side reports
  // post-processing dimensions; we still ensure the final dimensions
  // are within the configured cap (defence-in-depth — if the resize
  // path was skipped for any reason, this catches it).
  const dimCap = resolveMaxImageDimensionPx();
  if (pyResult.data.widthPx > dimCap || pyResult.data.heightPx > dimCap) {
    await unlink(storagePath).catch(() => undefined);
    return {
      ok: false,
      errorCode: "dimensions-too-large",
      message: `${pyResult.data.widthPx}x${pyResult.data.heightPx}`,
    };
  }

  // Check whether this is a replacement (existing row for this slot) so
  // the audit-log captures the right action.
  const existing = await findStudyImage(input.studyId, input.kind);
  const wasReplacement = existing !== null;

  let saved: { id: string };
  try {
    saved = await upsertStudyImage(input.studyId, input.kind, {
      filename: storagePath,
      mimeType: pyResult.data.mimeType,
      widthPx: pyResult.data.widthPx,
      heightPx: pyResult.data.heightPx,
      fileSizeBytes: pyResult.data.fileSizeBytes,
    });
  } catch (err) {
    console.error("[upload-image] upsert failed", err);
    await unlink(storagePath).catch(() => undefined);
    return { ok: false, errorCode: "server" };
  }

  // If a replacement, the old file is now orphaned. Delete it so the
  // volume doesn't accumulate dead files. `existing.filename` was
  // written by a previous run of *this* function so the path layout
  // is the same.
  if (wasReplacement && existing && existing.filename !== storagePath) {
    await unlink(existing.filename).catch(() => undefined);
  }

  try {
    await createAuditEntry(input.organizationId, {
      user: { connect: { id: input.userId } },
      entityType: "StudyImage",
      entityId: saved.id,
      action: wasReplacement ? "IMAGE_REPLACED" : "IMAGE_UPLOADED",
      changeSet: {
        studyId: input.studyId,
        kind: input.kind,
        widthPx: pyResult.data.widthPx,
        heightPx: pyResult.data.heightPx,
        fileSizeBytes: pyResult.data.fileSizeBytes,
        mimeType: pyResult.data.mimeType,
        originalFilename: input.originalFilename,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
  } catch (err) {
    console.error("[upload-image] audit entry failed", err);
    // Audit failure is logged but does NOT roll back the upload — the
    // file is on disk and the row is persisted, so denying success
    // would surface as a phantom retry from the user. The audit-log
    // gap shows up as a forensic anomaly instead.
  }

  return {
    ok: true,
    image: {
      id: saved.id,
      kind: input.kind,
      widthPx: pyResult.data.widthPx,
      heightPx: pyResult.data.heightPx,
      fileSizeBytes: pyResult.data.fileSizeBytes,
      mimeType: pyResult.data.mimeType,
      wasReplacement,
    },
  };
}
