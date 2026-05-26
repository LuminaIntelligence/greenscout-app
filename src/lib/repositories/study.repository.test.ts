import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => {
  const study = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  };
  return { prisma: { study } };
});

import { prisma } from "@/lib/db";

import {
  countStudies,
  createStudy,
  findStudyById,
  InvalidStudyStatusTransitionError,
  listStudies,
  markStudyGenerated,
  setStudyStatus,
  softDeleteStudy,
  transferStudy,
  updateStudy,
} from "./study.repository";

const ORG = "greenscout";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("study.repository — organizationId filter", () => {
  it("findStudyById applies organizationId + soft-delete filter", async () => {
    await findStudyById(ORG, "study-1");
    expect(prisma.study.findFirst).toHaveBeenCalledWith({
      where: { id: "study-1", organizationId: ORG, deletedAt: null },
    });
  });

  it("findStudyById opts into includeDeleted when requested", async () => {
    await findStudyById(ORG, "study-1", { includeDeleted: true });
    expect(prisma.study.findFirst).toHaveBeenCalledWith({
      where: { id: "study-1", organizationId: ORG },
    });
  });

  it("listStudies applies organizationId", async () => {
    await listStudies(ORG);
    expect(prisma.study.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: ORG, deletedAt: null }),
      }),
    );
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

  it("listStudies with includeRelations sets the include block", async () => {
    await listStudies(ORG, { includeRelations: true });
    const call = vi.mocked(prisma.study.findMany).mock.calls[0]?.[0];
    expect(call?.include).toBeDefined();
    expect(call?.include?.consultant).toBeDefined();
    expect(call?.include?.customer).toBeDefined();
  });

  it("listStudies clamps take and skips by 0 default", async () => {
    await listStudies(ORG);
    expect(prisma.study.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50, skip: 0 }),
    );
  });

  it("listStudies accepts custom take and skip", async () => {
    await listStudies(ORG, { take: 25, skip: 50 });
    expect(prisma.study.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 25, skip: 50 }),
    );
  });

  it("listStudies clamps take above MAX_TAKE", async () => {
    await listStudies(ORG, { take: 500 });
    expect(prisma.study.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 200 }));
  });

  it("listStudies opts into includeDeleted when requested", async () => {
    await listStudies(ORG, { includeDeleted: true });
    expect(prisma.study.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ deletedAt: null }),
      }),
    );
  });

  it("countStudies applies the same filter shape", async () => {
    vi.mocked(prisma.study.count).mockResolvedValueOnce(42);
    const total = await countStudies(ORG, { status: "READY" });
    expect(total).toBe(42);
    expect(prisma.study.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        organizationId: ORG,
        status: "READY",
        deletedAt: null,
      }),
    });
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
});

describe("study.repository — soft-delete (race-safe)", () => {
  it("returns null when the row was already soft-deleted", async () => {
    vi.mocked(prisma.study.updateMany).mockResolvedValueOnce({ count: 0 });
    const result = await softDeleteStudy(ORG, "study-1", new Date());
    expect(result).toBeNull();
    expect(prisma.study.findFirst).not.toHaveBeenCalled();
  });

  it("returns the row when a write happened", async () => {
    const deletedAt = new Date("2026-06-01T10:00:00.000Z");
    vi.mocked(prisma.study.updateMany).mockResolvedValueOnce({ count: 1 });
    vi.mocked(prisma.study.findFirst).mockResolvedValueOnce({
      id: "study-1",
      deletedAt,
    } as never);
    const result = await softDeleteStudy(ORG, "study-1", deletedAt);
    expect(result).not.toBeNull();
    expect(prisma.study.updateMany).toHaveBeenCalledWith({
      where: { id: "study-1", organizationId: ORG, deletedAt: null },
      data: { deletedAt },
    });
  });
});

describe("study.repository — setStudyStatus state machine", () => {
  it("returns null when the study is not found", async () => {
    vi.mocked(prisma.study.findFirst).mockResolvedValueOnce(null);
    const result = await setStudyStatus(ORG, "study-1", "READY");
    expect(result).toBeNull();
    expect(prisma.study.update).not.toHaveBeenCalled();
  });

  it("allows DRAFT → READY", async () => {
    vi.mocked(prisma.study.findFirst).mockResolvedValueOnce({ status: "DRAFT" } as never);
    vi.mocked(prisma.study.update).mockResolvedValueOnce({
      id: "study-1",
      status: "READY",
    } as never);
    await setStudyStatus(ORG, "study-1", "READY");
    expect(prisma.study.update).toHaveBeenCalledWith({
      where: { id: "study-1", organizationId: ORG },
      data: { status: "READY" },
    });
  });

  it("allows READY → GENERATED and stamps generatedAt", async () => {
    vi.mocked(prisma.study.findFirst).mockResolvedValueOnce({ status: "READY" } as never);
    vi.mocked(prisma.study.update).mockResolvedValueOnce({
      id: "study-1",
      status: "GENERATED",
    } as never);
    await setStudyStatus(ORG, "study-1", "GENERATED");
    expect(prisma.study.update).toHaveBeenCalledWith({
      where: { id: "study-1", organizationId: ORG },
      data: expect.objectContaining({
        status: "GENERATED",
        generatedAt: expect.any(Date),
      }),
    });
  });

  it("short-circuits same-status transitions (no write)", async () => {
    vi.mocked(prisma.study.findFirst).mockResolvedValueOnce({ status: "READY" } as never);
    vi.mocked(prisma.study.findFirst).mockResolvedValueOnce({
      id: "study-1",
      status: "READY",
    } as never);
    const result = await setStudyStatus(ORG, "study-1", "READY");
    expect(result).not.toBeNull();
    expect(prisma.study.update).not.toHaveBeenCalled();
  });

  it("rejects READY → DRAFT", async () => {
    vi.mocked(prisma.study.findFirst).mockResolvedValueOnce({ status: "READY" } as never);
    await expect(setStudyStatus(ORG, "study-1", "DRAFT")).rejects.toBeInstanceOf(
      InvalidStudyStatusTransitionError,
    );
    expect(prisma.study.update).not.toHaveBeenCalled();
  });

  it("rejects GENERATED → DRAFT", async () => {
    vi.mocked(prisma.study.findFirst).mockResolvedValueOnce({ status: "GENERATED" } as never);
    await expect(setStudyStatus(ORG, "study-1", "DRAFT")).rejects.toBeInstanceOf(
      InvalidStudyStatusTransitionError,
    );
  });

  it("rejects GENERATED → READY", async () => {
    vi.mocked(prisma.study.findFirst).mockResolvedValueOnce({ status: "GENERATED" } as never);
    await expect(setStudyStatus(ORG, "study-1", "READY")).rejects.toBeInstanceOf(
      InvalidStudyStatusTransitionError,
    );
  });

  it("rejects DRAFT → GENERATED (must go through READY)", async () => {
    vi.mocked(prisma.study.findFirst).mockResolvedValueOnce({ status: "DRAFT" } as never);
    await expect(setStudyStatus(ORG, "study-1", "GENERATED")).rejects.toBeInstanceOf(
      InvalidStudyStatusTransitionError,
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
