import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => {
  const customer = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  };
  return { prisma: { customer } };
});

import { prisma } from "@/lib/db";

import {
  countCustomers,
  createCustomer,
  findCustomerById,
  listCustomers,
  softDeleteCustomer,
  updateCustomer,
} from "./customer.repository";

const ORG = "greenscout";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("customer.repository — organizationId filter", () => {
  it("findCustomerById applies organizationId", async () => {
    await findCustomerById(ORG, "cust-1");
    expect(prisma.customer.findFirst).toHaveBeenCalledWith({
      where: { id: "cust-1", organizationId: ORG, deletedAt: null },
    });
  });

  it("listCustomers applies organizationId", async () => {
    await listCustomers(ORG);
    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: ORG }),
      }),
    );
  });

  it("createCustomer overrides any organizationId on the input data", async () => {
    await createCustomer(ORG, {
      contactFirstName: "Anna",
      contactLastName: "Beispiel",
      organizationId: "other-tenant",
    });
    expect(prisma.customer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ organizationId: ORG }),
    });
  });

  it("updateCustomer scopes the update to organizationId", async () => {
    await updateCustomer(ORG, "cust-1", { phone: "555" });
    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: "cust-1", organizationId: ORG },
      data: { phone: "555" },
    });
  });
});

describe("customer.repository — soft-delete filter", () => {
  it("findCustomerById excludes soft-deleted rows by default", async () => {
    await findCustomerById(ORG, "cust-1");
    expect(prisma.customer.findFirst).toHaveBeenCalledWith({
      where: { id: "cust-1", organizationId: ORG, deletedAt: null },
    });
  });

  it("findCustomerById includes soft-deleted when opted in", async () => {
    await findCustomerById(ORG, "cust-1", { includeDeleted: true });
    expect(prisma.customer.findFirst).toHaveBeenCalledWith({
      where: { id: "cust-1", organizationId: ORG },
    });
  });

  it("listCustomers excludes soft-deleted rows by default", async () => {
    await listCustomers(ORG);
    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });

  it("softDeleteCustomer scopes updateMany to organizationId + deletedAt:null", async () => {
    const stamp = new Date("2026-05-21T18:00:00.000Z");
    vi.mocked(prisma.customer.updateMany).mockResolvedValueOnce({ count: 1 });
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({
      id: "cust-1",
      organizationId: ORG,
      deletedAt: stamp,
    } as never);

    const result = await softDeleteCustomer(ORG, "cust-1", stamp);

    expect(prisma.customer.updateMany).toHaveBeenCalledWith({
      where: { id: "cust-1", organizationId: ORG, deletedAt: null },
      data: { deletedAt: stamp },
    });
    // Re-read uses `includeDeleted: true` so the freshly-soft-deleted
    // row is visible (otherwise the default filter would drop it).
    expect(prisma.customer.findFirst).toHaveBeenCalledWith({
      where: { id: "cust-1", organizationId: ORG },
    });
    expect(result).toEqual(expect.objectContaining({ id: "cust-1", deletedAt: stamp }));
  });

  it("softDeleteCustomer returns null when no row matches (already deleted or wrong org)", async () => {
    vi.mocked(prisma.customer.updateMany).mockResolvedValueOnce({ count: 0 });
    const result = await softDeleteCustomer(ORG, "cust-cross-tenant", new Date());
    expect(result).toBeNull();
    expect(prisma.customer.findFirst).not.toHaveBeenCalled();
  });

  it("softDeleteCustomer is idempotent — second call matches zero rows", async () => {
    const stamp = new Date("2026-05-21T18:00:00.000Z");
    // First call: row exists, gets soft-deleted.
    vi.mocked(prisma.customer.updateMany).mockResolvedValueOnce({ count: 1 });
    vi.mocked(prisma.customer.findFirst).mockResolvedValueOnce({
      id: "cust-1",
      organizationId: ORG,
      deletedAt: stamp,
    } as never);
    const first = await softDeleteCustomer(ORG, "cust-1", stamp);
    expect(first).not.toBeNull();

    // Second call: `updateMany` filter `deletedAt: null` no longer matches.
    vi.mocked(prisma.customer.updateMany).mockResolvedValueOnce({ count: 0 });
    const second = await softDeleteCustomer(ORG, "cust-1", new Date());
    expect(second).toBeNull();
  });
});

describe("customer.repository — search + pagination", () => {
  it("listCustomers passes case-insensitive search across companyName/contactLastName", async () => {
    await listCustomers(ORG, { search: "müller" });
    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { contactLastName: { contains: "müller", mode: "insensitive" } },
            { companyName: { contains: "müller", mode: "insensitive" } },
          ],
        }),
      }),
    );
  });

  it("listCustomers caps take at 200", async () => {
    await listCustomers(ORG, { take: 9999 });
    expect(prisma.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 200 }));
  });

  it("listCustomers defaults to take=50 when unspecified", async () => {
    await listCustomers(ORG);
    expect(prisma.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 50 }));
  });
});

describe("customer.repository — T-022 includeStudyCount + countCustomers", () => {
  it("listCustomers passes `include._count.studies` when includeStudyCount=true", async () => {
    await listCustomers(ORG, { includeStudyCount: true });
    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { _count: { select: { studies: true } } },
      }),
    );
  });

  it("listCustomers omits the include block when includeStudyCount is unset", async () => {
    await listCustomers(ORG);
    const callArg = vi.mocked(prisma.customer.findMany).mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(callArg).not.toHaveProperty("include");
  });

  it("listCustomers honours search alongside includeStudyCount", async () => {
    await listCustomers(ORG, { includeStudyCount: true, search: "Müller" });
    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { contactLastName: { contains: "Müller", mode: "insensitive" } },
            { companyName: { contains: "Müller", mode: "insensitive" } },
          ],
        }),
        include: { _count: { select: { studies: true } } },
      }),
    );
  });

  it("countCustomers applies organizationId + soft-delete filter by default", async () => {
    vi.mocked(prisma.customer.count).mockResolvedValueOnce(42);
    const result = await countCustomers(ORG);
    expect(result).toBe(42);
    expect(prisma.customer.count).toHaveBeenCalledWith({
      where: { organizationId: ORG, deletedAt: null },
    });
  });

  it("countCustomers mirrors the listCustomers search predicate", async () => {
    vi.mocked(prisma.customer.count).mockResolvedValueOnce(3);
    const result = await countCustomers(ORG, { search: "hofgut" });
    expect(result).toBe(3);
    expect(prisma.customer.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        organizationId: ORG,
        deletedAt: null,
        OR: [
          { contactLastName: { contains: "hofgut", mode: "insensitive" } },
          { companyName: { contains: "hofgut", mode: "insensitive" } },
        ],
      }),
    });
  });

  it("countCustomers includes soft-deleted rows when opted in", async () => {
    vi.mocked(prisma.customer.count).mockResolvedValueOnce(7);
    await countCustomers(ORG, { includeDeleted: true });
    expect(prisma.customer.count).toHaveBeenCalledWith({
      where: { organizationId: ORG },
    });
  });
});
