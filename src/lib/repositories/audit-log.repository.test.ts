import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => {
  const auditLog = {
    findMany: vi.fn(),
    create: vi.fn(),
  };
  return { prisma: { auditLog } };
});

import { prisma } from "@/lib/db";

import { createAuditEntry, listAuditEntries } from "./audit-log.repository";

const ORG = "greenscout";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("audit-log.repository — organizationId enforcement", () => {
  it("createAuditEntry overrides any organizationId on the input data", async () => {
    await createAuditEntry(ORG, {
      entityType: "Study",
      action: "CREATE",
      organizationId: "other-tenant",
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "Study",
        action: "CREATE",
        organizationId: ORG,
      }),
    });
  });

  it("listAuditEntries applies organizationId to the where clause", async () => {
    await listAuditEntries(ORG);
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: ORG }),
      }),
    );
  });
});

describe("audit-log.repository — filtering", () => {
  it("listAuditEntries forwards userId / entityType / entityId / action filters", async () => {
    await listAuditEntries(ORG, {
      userId: "user-1",
      entityType: "Study",
      entityId: "study-1",
      action: "UPDATE",
    });
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          entityType: "Study",
          entityId: "study-1",
          action: "UPDATE",
        }),
      }),
    );
  });

  it("listAuditEntries forwards fromDate/toDate as a createdAt range", async () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const to = new Date("2026-12-31T23:59:59Z");
    await listAuditEntries(ORG, { fromDate: from, toDate: to });
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { gte: from, lte: to },
        }),
      }),
    );
  });

  it("listAuditEntries defaults to createdAt DESC", async () => {
    await listAuditEntries(ORG);
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } }),
    );
  });
});
