/**
 * T-023 update-customer Server Action tests.
 *
 * Same mock topology as `create-customer.test.ts`. Coverage targets:
 *   - forbidden (no session)
 *   - validation (zod issues mapped to fieldErrors)
 *   - not-found (existing row missing → multi-tenant safety)
 *   - no-op edit (no diff, no audit row)
 *   - happy path (persists + audit diff + revalidatePath x2)
 *   - server (repository throws after the ownership check)
 *
 * 100% per-pattern threshold per the T-023 plan (multi-tenant + audit-
 * critical surface).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/repositories/customer.repository", () => ({
  findCustomerById: vi.fn(),
  updateCustomer: vi.fn(),
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
import { findCustomerById, updateCustomer } from "@/lib/repositories/customer.repository";
import { revalidatePath } from "next/cache";

import { updateCustomerAction } from "./update-customer";

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

const EXISTING = {
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

beforeEach(() => {
  vi.clearAllMocks();
  headersStore.clear();
  mockedAuth.mockResolvedValue(SESSION);
  vi.mocked(findCustomerById).mockResolvedValue(EXISTING);
  vi.mocked(updateCustomer).mockResolvedValue(EXISTING);
});

describe("updateCustomerAction", () => {
  it("returns forbidden when no session is present", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await updateCustomerAction("cust-1", {
      contactFirstName: "Anna",
      contactLastName: "Berger",
    });
    expect(result).toEqual({ ok: false, errorCode: "forbidden" });
    expect(findCustomerById).not.toHaveBeenCalled();
    expect(updateCustomer).not.toHaveBeenCalled();
    expect(createAuditEntry).not.toHaveBeenCalled();
  });

  it("returns validation when the payload fails the schema", async () => {
    const result = await updateCustomerAction("cust-1", {
      contactFirstName: "",
      contactLastName: "Berger",
      email: "not-an-email",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe("validation");
    expect(result.fieldErrors?.contactFirstName).toBe("customers.error.first-name-required");
    expect(result.fieldErrors?.email).toBe("customers.error.invalid-email");
    expect(findCustomerById).not.toHaveBeenCalled();
  });

  it("collapses duplicate issues on the same field to the first message", async () => {
    const result = await updateCustomerAction("cust-1", {
      contactFirstName: 123, // wrong type
      contactLastName: "Berger",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe("validation");
    expect(typeof result.fieldErrors?.contactFirstName).toBe("string");
  });

  it("returns not-found when the customer does not exist in this org", async () => {
    vi.mocked(findCustomerById).mockResolvedValueOnce(null);
    const result = await updateCustomerAction("cust-cross-tenant", {
      contactFirstName: "Anna",
      contactLastName: "Berger",
    });
    expect(result).toEqual({ ok: false, errorCode: "not-found" });
    expect(updateCustomer).not.toHaveBeenCalled();
    expect(createAuditEntry).not.toHaveBeenCalled();
  });

  it("short-circuits with ok when the diff is empty (no fields changed)", async () => {
    const result = await updateCustomerAction("cust-1", {
      contactFirstName: "Anna",
      contactLastName: "Berger",
      companyName: "Hofgut Sonnenwiese GmbH",
      email: "anna@hofgut-sonnenwiese.de",
      billingCity: "Stuttgart",
      // phone / billingAddress / billingZipCode / notes stay null
    });
    expect(result).toEqual({ ok: true, customerId: "cust-1" });
    expect(updateCustomer).not.toHaveBeenCalled();
    expect(createAuditEntry).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("persists the diff, writes an UPDATE audit row, revalidates both paths, returns ok", async () => {
    headersStore.set("x-forwarded-for", "10.0.0.1, 10.0.0.2");
    headersStore.set("user-agent", "Mozilla/5.0");

    const result = await updateCustomerAction("cust-1", {
      contactFirstName: "Anna",
      contactLastName: "Berger-Neumann", // changed
      companyName: "Hofgut Sonnenwiese GmbH",
      email: "anna@hofgut-sonnenwiese.de",
      billingCity: "Stuttgart",
      phone: "+49 711 1234567", // newly set
    });

    expect(result).toEqual({ ok: true, customerId: "cust-1" });

    expect(updateCustomer).toHaveBeenCalledTimes(1);
    expect(updateCustomer).toHaveBeenCalledWith(
      "greenscout",
      "cust-1",
      expect.objectContaining({
        contactLastName: "Berger-Neumann",
        phone: "+49 711 1234567",
      }),
    );

    expect(createAuditEntry).toHaveBeenCalledTimes(1);
    expect(createAuditEntry).toHaveBeenCalledWith("greenscout", {
      user: { connect: { id: "user-1" } },
      entityType: "Customer",
      entityId: "cust-1",
      action: "UPDATE",
      changeSet: {
        contactLastName: ["Berger", "Berger-Neumann"],
        phone: [null, "+49 711 1234567"],
      },
      ipAddress: "10.0.0.1",
      userAgent: "Mozilla/5.0",
    });

    expect(revalidatePath).toHaveBeenCalledWith("/customers");
    expect(revalidatePath).toHaveBeenCalledWith("/customers/cust-1/edit");
  });

  it("records a field cleared to null in the audit diff", async () => {
    const result = await updateCustomerAction("cust-1", {
      contactFirstName: "Anna",
      contactLastName: "Berger",
      companyName: "", // cleared → undefined → null in audit diff
      email: "anna@hofgut-sonnenwiese.de",
      billingCity: "Stuttgart",
    });

    expect(result.ok).toBe(true);
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({
        changeSet: { companyName: ["Hofgut Sonnenwiese GmbH", null] },
      }),
    );
  });

  it("forwards null ipAddress + userAgent when headers are absent", async () => {
    const result = await updateCustomerAction("cust-1", {
      contactFirstName: "Anna",
      contactLastName: "Berger-Neumann",
      companyName: "Hofgut Sonnenwiese GmbH",
      email: "anna@hofgut-sonnenwiese.de",
      billingCity: "Stuttgart",
    });

    expect(result.ok).toBe(true);
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({ ipAddress: null, userAgent: null }),
    );
  });

  it("returns server errorCode when updateCustomer throws", async () => {
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => undefined);

    vi.mocked(updateCustomer).mockRejectedValueOnce(new Error("db boom"));

    const result = await updateCustomerAction("cust-1", {
      contactFirstName: "Anna",
      contactLastName: "Berger-Neumann",
      companyName: "Hofgut Sonnenwiese GmbH",
      email: "anna@hofgut-sonnenwiese.de",
      billingCity: "Stuttgart",
    });

    expect(result).toEqual({ ok: false, errorCode: "server" });
    expect(createAuditEntry).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(consoleErr).toHaveBeenCalled();

    consoleErr.mockRestore();
  });
});
