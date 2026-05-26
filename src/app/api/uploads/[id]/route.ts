import { readFile } from "node:fs/promises";
import { resolve as resolvePath, sep as pathSep } from "node:path";

import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { findStudyById } from "@/lib/repositories/study.repository";
import { findStudyImageById } from "@/lib/repositories/study-image.repository";

/**
 * T-029a — Image download route for the consultant UI.
 *
 * GET-only Route Handler that streams an uploaded BEFORE / AFTER image
 * from disk with a `Content-Disposition: inline` header (so the
 * `<img>` preview in the wizard works without a download). Auth-gated
 * + ownership-checked:
 *
 *   - 401 if no session,
 *   - 404 if the image doesn't exist or the study isn't accessible
 *     (own study for BERATER, any for ADMIN),
 *   - 403 if the stored filename would escape `UPLOADS_DIR`,
 *   - 500 if the file is missing on disk.
 *
 * Path-traversal defence: the stored filename is resolved and matched
 * against `UPLOADS_DIR`. We never accept a user-supplied path.
 */

export const dynamic = "force-dynamic";

const CONTENT_TYPE_BY_MIME: Record<string, string> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
};

function isInside(child: string, parent: string): boolean {
  const childResolved = resolvePath(child);
  const parentResolved = resolvePath(parent);
  return childResolved === parentResolved || childResolved.startsWith(parentResolved + pathSep);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const image = await findStudyImageById(id);
  if (image === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // The image's parent study scopes the ownership check.
  const study = await findStudyById(session.user.organizationId, image.studyId);
  if (study === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (session.user.role !== "ADMIN" && study.consultantId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const uploadsRoot = resolvePath(process.env.UPLOADS_DIR ?? "./uploads");
  const absolutePath = resolvePath(image.filename);
  if (!isInside(absolutePath, uploadsRoot)) {
    return NextResponse.json(
      { error: "Refusing to serve file outside the uploads root" },
      { status: 403 },
    );
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(absolutePath);
  } catch {
    return NextResponse.json({ error: "File missing on disk" }, { status: 500 });
  }

  const contentType = CONTENT_TYPE_BY_MIME[image.mimeType] ?? "application/octet-stream";
  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": "inline",
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, max-age=0, no-cache",
    },
  });
}
