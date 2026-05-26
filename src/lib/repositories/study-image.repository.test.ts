import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => {
  const studyImage = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  };
  return { prisma: { studyImage } };
});

import { prisma } from "@/lib/db";

import {
  deleteStudyImage,
  findStudyImage,
  findStudyImageById,
  listStudyImages,
  upsertStudyImage,
} from "./study-image.repository";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("study-image.repository", () => {
  it("findStudyImage uses the (studyId, type) compound unique key", async () => {
    await findStudyImage("study-1", "BEFORE");
    expect(prisma.studyImage.findUnique).toHaveBeenCalledWith({
      where: { studyId_type: { studyId: "study-1", type: "BEFORE" } },
    });
  });

  it("findStudyImageById looks up by primary key", async () => {
    await findStudyImageById("img-1");
    expect(prisma.studyImage.findUnique).toHaveBeenCalledWith({
      where: { id: "img-1" },
    });
  });

  it("listStudyImages returns both BEFORE and AFTER ordered by type ASC", async () => {
    await listStudyImages("study-1");
    expect(prisma.studyImage.findMany).toHaveBeenCalledWith({
      where: { studyId: "study-1" },
      orderBy: { type: "asc" },
    });
  });

  it("upsertStudyImage uses the compound unique key and connects the study", async () => {
    await upsertStudyImage("study-1", "AFTER", {
      filename: "after.jpg",
      mimeType: "image/jpeg",
      widthPx: 1920,
      heightPx: 1080,
      fileSizeBytes: 250000,
    });
    expect(prisma.studyImage.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studyId_type: { studyId: "study-1", type: "AFTER" } },
        create: expect.objectContaining({
          type: "AFTER",
          study: { connect: { id: "study-1" } },
          filename: "after.jpg",
        }),
        update: expect.objectContaining({ filename: "after.jpg" }),
      }),
    );
  });

  it("deleteStudyImage uses the compound unique key", async () => {
    await deleteStudyImage("study-1", "BEFORE");
    expect(prisma.studyImage.delete).toHaveBeenCalledWith({
      where: { studyId_type: { studyId: "study-1", type: "BEFORE" } },
    });
  });
});
