import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => {
  const generatedDocument = {
    findMany: vi.fn(),
    create: vi.fn(),
  };
  return { prisma: { generatedDocument } };
});

import { prisma } from "@/lib/db";

import { createDocument, listDocumentsForStudy } from "./generated-document.repository";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generated-document.repository", () => {
  it("listDocumentsForStudy filters by studyId and orders generatedAt DESC", async () => {
    await listDocumentsForStudy("study-1");
    expect(prisma.generatedDocument.findMany).toHaveBeenCalledWith({
      where: { studyId: "study-1" },
      orderBy: { generatedAt: "desc" },
      take: 50,
      skip: 0,
    });
  });

  it("listDocumentsForStudy caps take at 200", async () => {
    await listDocumentsForStudy("study-1", { take: 9999 });
    expect(prisma.generatedDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    );
  });

  it("createDocument connects the parent study and forwards the artefact payload", async () => {
    await createDocument("study-1", {
      format: "PPTX",
      filename: "Machbarkeitsstudie.pptx",
      generatedBy: { connect: { id: "user-1" } },
    });
    expect(prisma.generatedDocument.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        format: "PPTX",
        filename: "Machbarkeitsstudie.pptx",
        study: { connect: { id: "study-1" } },
        generatedBy: { connect: { id: "user-1" } },
      }),
    });
  });
});
