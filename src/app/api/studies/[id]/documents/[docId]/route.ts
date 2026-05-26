import { readFile } from "node:fs/promises";
import { resolve as resolvePath, sep as pathSep } from "node:path";

import { NextResponse } from "next/server";

import { canAccessStudy } from "@/features/auth/utils/can-access-study";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findStudyById } from "@/lib/repositories/study.repository";

/**
 * T-040 generated-document download route.
 *
 * GET-only Route Handler that streams a generated PPTX / PDF file
 * from disk with a `Content-Disposition: attachment` header
 * (SPEC §6.3 file-serving rule). Auth-gated + ownership-checked:
 *
 *   - returns 401 if no session,
 *   - returns 404 if the study isn't accessible to the caller
 *     (own study for BERATER, any for ADMIN),
 *   - returns 404 if the document does not belong to the study,
 *   - returns 500 if the file does not exist on disk.
 *
 * Path-traversal defense: the stored `filename` is the absolute path
 * returned by the Python service. We resolve it and ensure it sits
 * underneath the configured `GENERATED_DIR` root.
 */

export const dynamic = "force-dynamic";

const ALLOWED_FORMATS = new Set(["PPTX", "PDF"]);

function contentTypeFor(format: string): string {
  if (format === "PPTX") {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  if (format === "PDF") {
    return "application/pdf";
  }
  return "application/octet-stream";
}

function inferDownloadName(absolutePath: string, format: string): string {
  const parts = absolutePath.split(/[\\/]/);
  const last = parts.length === 0 ? "study" : parts[parts.length - 1];
  if (last.length === 0) {
    return `study.${format.toLowerCase()}`;
  }
  return last;
}

function isInside(child: string, parent: string): boolean {
  const childResolved = resolvePath(child);
  const parentResolved = resolvePath(parent);
  return childResolved === parentResolved || childResolved.startsWith(parentResolved + pathSep);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; docId: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: studyId, docId } = await context.params;

  const study = await findStudyById(session.user.organizationId, studyId);
  if (study === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canAccessStudy(session, study)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const doc = await prisma.generatedDocument.findFirst({
    where: { id: docId, studyId },
    select: { id: true, format: true, filename: true },
  });
  if (doc === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!ALLOWED_FORMATS.has(doc.format)) {
    return NextResponse.json({ error: "Unsupported format" }, { status: 415 });
  }

  // Resolve the file path. The stored filename is absolute, written by
  // the Python service into GENERATED_DIR. Path-traversal defense:
  // confirm the resolved path is inside GENERATED_DIR (defaults to
  // ./generated on dev).
  const generatedRoot = resolvePath(process.env.GENERATED_DIR ?? "./generated");
  const absolutePath = resolvePath(doc.filename);
  if (!isInside(absolutePath, generatedRoot)) {
    return NextResponse.json(
      { error: "Refusing to serve file outside the generated-files root" },
      { status: 403 },
    );
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(absolutePath);
  } catch {
    return NextResponse.json({ error: "File missing on disk" }, { status: 500 });
  }

  const downloadName = inferDownloadName(doc.filename, doc.format);
  // Cast to Uint8Array so the NextResponse body typing is happy (Buffer
  // extends Uint8Array; the SDK insists on the narrower BodyInit shape).
  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": contentTypeFor(doc.format),
      "Content-Disposition": `attachment; filename="${downloadName}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
