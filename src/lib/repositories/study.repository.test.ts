import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => {
  const study = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  return { prisma: { study } };
});

import { prisma } from "@/lib/db";

import {
  createStudy,
  findStudyById,
  listStudies,
  markStudyGenerated,
  softDeleteStudy,
  transferStudy,
  updateStudy,
} from "./study.repository";

const ORG = "greenscout";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("study.repository — organizationId filter", () => {
  it("findStudyById applies organizationId", async () => {
    await findStudyById(ORG, "study-1");
    expect(prisma.study.findFirst).toHaveBeenCalledWith({
      where: { id: "study-1", organizationId: ORG, deletedAt: null },
    });
  });

  it("listStudies applies organizationId", async () => {
    await listStudies(ORG);
    expect(prisma.study.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: ORG }),
      }),
    );
  });

  it("createStudy overrides any organizationId on the input data", async () => {
    await createStudy(ORG, {
      objectName: "Hof",
      objectAddress: "Beispielweg 1",
      objectZipCode: "12345",
      objectCity: "Berlin",
      flurstueck: "1/2",
      anlageKwp: 100,
      pvErzeugungKwhJahr: 95000,
      pvEigenverbrauchKwhJahr: 30000,
      pvVerkaufEurKwh: 0.08,
      verbrauchKwhJahr: 50000,
      versorgerPreisEurKwh: 0.35,
      consultant: { connect: { id: "user-1" } },
      customer: { connect: { id: "cust-1" } },
      organizationId: "other-tenant",
    });
    expect(prisma.study.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ organizationId: ORG }),
    });
  });

  it("listStudies forwards consultantId/customerId/status filters", async () => {
    await listStudies(ORG, {
      consultantId: "user-1",
      customerId: "cust-1",
      status: "DRAFT",
    });
    expect(prisma.study.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: ORG,
          consultantId: "user-1",
          customerId: "cust-1",
          status: "DRAFT",
        }),
      }),
    );
  });
});

describe("study.repository — soft-delete filter", () => {
  it("findStudyById excludes soft-deleted rows by default", async () => {
    await findStudyById(ORG, "study-1");
    expect(prisma.study.findFirst).toHaveBeenCalledWith({
      where: { id: "study-1", organizationId: ORG, deletedAt: null },
    });
  });

  it("findStudyById includes soft-deleted when opted in", async () => {
    await findStudyById(ORG, "study-1", { includeDeleted: true });
    expect(prisma.study.findFirst).toHaveBeenCalledWith({
      where: { id: "study-1", organizationId: ORG },
    });
  });

  it("listStudies excludes soft-deleted rows by default", async () => {
    await listStudies(ORG);
    expect(prisma.study.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });

  it("softDeleteStudy sets deletedAt", async () => {
    await softDeleteStudy(ORG, "study-1");
    expect(prisma.study.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "study-1", organizationId: ORG },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });
});

describe("study.repository — domain helpers", () => {
  it("markStudyGenerated sets status=GENERATED and stamps generatedAt", async () => {
    await markStudyGenerated(ORG, "study-1");
    expect(prisma.study.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "study-1", organizationId: ORG },
        data: expect.objectContaining({
          status: "GENERATED",
          generatedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("transferStudy reassigns consultantId", async () => {
    await transferStudy(ORG, "study-1", "user-2");
    expect(prisma.study.update).toHaveBeenCalledWith({
      where: { id: "study-1", organizationId: ORG },
      data: { consultantId: "user-2" },
    });
  });

  it("updateStudy scopes the update to organizationId", async () => {
    await updateStudy(ORG, "study-1", { objectName: "Neu" });
    expect(prisma.study.update).toHaveBeenCalledWith({
      where: { id: "study-1", organizationId: ORG },
      data: { objectName: "Neu" },
    });
  });
});
