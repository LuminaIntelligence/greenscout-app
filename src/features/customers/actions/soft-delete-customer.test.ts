/**
 * T-024 soft-delete-customer Server Action tests.
 *
 * Same mock topology as `update-customer.test.ts`. Coverage targets
 * every branch in `soft-delete-customer.ts`:
 *
 *   - zod schema failure on FormData with no customerId
 *   - no-session → errorCode "server"
 *   - not-found (findCustomerById returns null) → errorCode "not-found"
 *   - idempotent already-deleted (existing.deletedAt set) → ok=true,
 *     KEIN auditLog.create, KEIN repo softDelete call
 *   - happy path → repo + audit + revalidatePath all invoked exactly once
 *   - race window (softDeleteCustomer returns null after the read-first
 *     check) → ok=true, KEIN audit row
 *   - repo throws → errorCode "server"
 *   - header extraction: x-forwarded-for with two values → first wins,
 *     and a separate path without headers → ipAddress + userAgent null
 *
 * 100% per-pattern threshold per T-024 plan — multi-tenant + audit-
 * critical + idempotency-critical surface.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/repositories/customer.repository", () => ({
  findCustomerById: vi.fn(),
  softDeleteCustomer: vi.fn(),
}));

vi.mock("@/lib/repositories/audit-log.repository", () => ({
  createAuditEntry: vi.fn().mockResolvedValue(undefined),
}));

const headersStore = new Map<string, string | null>();
vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (name: string) => headersStore.get(name.toLowerCase()) ?? null,
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { findCustomerById, softDeleteCustomer } from "@/lib/repositories/customer.repository";
import { revalidatePath } from "next/cache";

import { softDeleteCustomerAction } from "./soft-delete-customer";

// `auth` is overloaded — see create-customer.test.ts for context.
const mockedAuth = vi.mocked(auth) as unknown as ReturnType<typeof vi.fn<() => Promise<unknown>>>;

const SESSION = {
  user: {
    id: "user-1",
    email: "berater@example.com",
    role: "BERATER" as const,
    mustChangePassword: false,
    formPreference: "WIZARD" as const,
    organizationId: "greenscout",
  },
  expires: "2099-01-01T00:00:00.000Z",
};

const EXISTING_ACTIVE = {
  id: "cust-1",
  contactFirstName: "Anna",
  contactLastName: "Berger",
  companyName: "Hofgut Sonnenwiese GmbH",
  email: "anna@hofgut-sonnenwiese.de",
  phone: null,
  billingAddress: null,
  billingZipCode: null,
  billingCity: "Stuttgart",
  notes: null,
  deletedAt: null,
  organizationId: "greenscout",
  createdAt: new Date("2026-05-01T10:00:00.000Z"),
  updatedAt: new Date("2026-05-01T10:00:00.000Z"),
};

const EXISTING_SOFT_DELETED = {
  ...EXISTING_ACTIVE,
  deletedAt: new Date("2026-05-15T09:00:00.000Z"),
};

function formDataWith(customerId: string | null): FormData {
  const fd = new FormData();
  if (customerId !== null) fd.set("customerId", customerId);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  headersStore.clear();
  mockedAuth.mockResolvedValue(SESSION);
  vi.mocked(findCustomerById).mockResolvedValue(EXISTING_ACTIVE);
  vi.mocked(softDeleteCustomer).mockResolvedValue(EXISTING_SOFT_DELETED);
});

describe("softDeleteCustomerAction", () => {
  it("returns server errorCode when FormData has no customerId (zod parse fails)", async () => {
    const result = await softDeleteCustomerAction(formDataWith(null));
    expect(result).toEqual({ ok: false, errorCode: "server" });
    expect(auth).not.toHaveBeenCalled();
    expect(findCustomerById).not.toHaveBeenCalled();
    expect(softDeleteCustomer).not.toHaveBeenCalled();
    expect(createAuditEntry).not.toHaveBeenCalled();
  });

  it("returns server errorCode when there is no session", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await softDeleteCustomerAction(formDataWith("cust-1"));
    expect(result).toEqual({ ok: false, errorCode: "server" });
    expect(findCustomerById).not.toHaveBeenCalled();
    expect(softDeleteCustomer).not.toHaveBeenCalled();
    expect(createAuditEntry).not.toHaveBeenCalled();
  });

  it("returns not-found when the customer does not exist (or wrong org)", async () => {
    vi.mocked(findCustomerById).mockResolvedValueOnce(null);
    const result = await softDeleteCustomerAction(formDataWith("cust-unknown"));
    expect(result).toEqual({ ok: false, errorCode: "not-found" });
    // `includeDeleted: true` so existing-but-soft-deleted rows surface
    // distinctly from truly-missing rows.
    expect(findCustomerById).toHaveBeenCalledWith("greenscout", "cust-unknown", {
      includeDeleted: true,
    });
    expect(softDeleteCustomer).not.toHaveBeenCalled();
    expect(createAuditEntry).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("is idempotent: returns ok WITHOUT a second audit row when row is already soft-deleted", async () => {
    vi.mocked(findCustomerById).mockResolvedValueOnce(EXISTING_SOFT_DELETED);
    const result = await softDeleteCustomerAction(formDataWith("cust-1"));
    expect(result).toEqual({ ok: true, customerId: "cust-1" });
    expect(softDeleteCustomer).not.toHaveBeenCalled();
    expect(createAuditEntry).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("persists soft-delete, writes SOFT_DELETE audit row, revalidates list, returns ok", async () => {
    headersStore.set("x-forwarded-for", "10.0.0.1, 10.0.0.2");
    headersStore.set("user-agent", "Mozilla/5.0");

    const result = await softDeleteCustomerAction(formDataWith("cust-1"));

    expect(result).toEqual({ ok: true, customerId: "cust-1" });

    expect(softDeleteCustomer).toHaveBeenCalledTimes(1);
    const repoCall = vi.mocked(softDeleteCustomer).mock.calls[0];
    expect(repoCall?.[0]).toBe("greenscout");
    expect(repoCall?.[1]).toBe("cust-1");
    expect(repoCall?.[2]).toBeInstanceOf(Date);

    expect(createAuditEntry).toHaveBeenCalledTimes(1);
    const auditCall = vi.mocked(createAuditEntry).mock.calls[0];
    expect(auditCall?.[0]).toBe("greenscout");
    const auditPayload = auditCall?.[1] as {
      user: unknown;
      entityType: string;
      entityId: string;
      action: string;
      changeSet: Record<string, [null, string]>;
      ipAddress: string | null;
      userAgent: string | null;
    };
    expect(auditPayload.user).toEqual({ connect: { id: "user-1" } });
    expect(auditPayload.entityType).toBe("Customer");
    expect(auditPayload.entityId).toBe("cust-1");
    expect(auditPayload.action).toBe("SOFT_DELETE");
    expect(auditPayload.ipAddress).toBe("10.0.0.1");
    expect(auditPayload.userAgent).toBe("Mozilla/5.0");
    expect(auditPayload.changeSet.deletedAt[0]).toBeNull();
    expect(typeof auditPayload.changeSet.deletedAt[1]).toBe("string");
    // Stamp passed to the repo equals the ISO recorded in the diff.
    expect((repoCall?.[2] as Date).toISOString()).toBe(auditPayload.changeSet.deletedAt[1]);

    expect(revalidatePath).toHaveBeenCalledWith("/customers");
  });

  it("forwards null ipAddress + userAgent when headers are absent", async () => {
    const result = await softDeleteCustomerAction(formDataWith("cust-1"));
    expect(result.ok).toBe(true);
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({ ipAddress: null, userAgent: null }),
    );
  });

  it("treats a repo race-loss (updateMany matched 0 rows) as the idempotent success path — no audit row", async () => {
    vi.mocked(softDeleteCustomer).mockResolvedValueOnce(null);
    const result = await softDeleteCustomerAction(formDataWith("cust-1"));
    expect(result).toEqual({ ok: true, customerId: "cust-1" });
    expect(createAuditEntry).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns server errorCode when softDeleteCustomer throws", async () => {
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => undefined);

    vi.mocked(softDeleteCustomer).mockRejectedValueOnce(new Error("db boom"));

    const result = await softDeleteCustomerAction(formDataWith("cust-1"));

    expect(result).toEqual({ ok: false, errorCode: "server" });
    expect(createAuditEntry).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(consoleErr).toHaveBeenCalled();

    consoleErr.mockRestore();
  });
});
