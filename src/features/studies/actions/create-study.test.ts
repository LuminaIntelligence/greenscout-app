import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/repositories/study.repository", () => ({
  createStudy: vi.fn(),
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
import { createStudy } from "@/lib/repositories/study.repository";
import { revalidatePath } from "next/cache";

import { createStudyAction } from "./create-study";

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

const NEW_STUDY = {
  id: "study-new-1",
  consultantId: "user-1",
  customerId: "cust-1",
  organizationId: "greenscout",
};

beforeEach(() => {
  vi.clearAllMocks();
  headersStore.clear();
  mockedAuth.mockResolvedValue(SESSION);
  vi.mocked(createStudy).mockResolvedValue(NEW_STUDY as never);
});

describe("createStudyAction", () => {
  it("returns forbidden when no session is present", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await createStudyAction({ customerId: "cust-1" });
    expect(result).toEqual({ ok: false, errorCode: "forbidden" });
    expect(createStudy).not.toHaveBeenCalled();
  });

  it("returns validation when customerId is missing", async () => {
    const result = await createStudyAction({});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe("validation");
    expect(result.fieldErrors?.customerId).toBe("studies.error.customer-required");
  });

  it("persists DRAFT study with sentinel zero defaults, writes audit, revalidates", async () => {
    headersStore.set("x-forwarded-for", "10.0.0.1, 10.0.0.2");
    headersStore.set("user-agent", "Mozilla/5.0");

    const result = await createStudyAction({ customerId: "cust-1" });

    expect(result).toEqual({ ok: true, studyId: "study-new-1" });

    expect(createStudy).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({
        consultant: { connect: { id: "user-1" } },
        customer: { connect: { id: "cust-1" } },
        status: "DRAFT",
        objectName: "",
        anlageKwp: 0,
      }),
    );

    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({
        entityType: "Study",
        entityId: "study-new-1",
        action: "CREATE",
        changeSet: { customerId: [null, "cust-1"] },
        ipAddress: "10.0.0.1",
        userAgent: "Mozilla/5.0",
      }),
    );

    expect(revalidatePath).toHaveBeenCalledWith("/studies");
  });

  it("forwards null ipAddress + userAgent when headers absent", async () => {
    const result = await createStudyAction({ customerId: "cust-1" });
    expect(result.ok).toBe(true);
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({ ipAddress: null, userAgent: null }),
    );
  });

  it("returns server when the repository throws", async () => {
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(createStudy).mockRejectedValueOnce(new Error("db boom"));

    const result = await createStudyAction({ customerId: "cust-1" });

    expect(result).toEqual({ ok: false, errorCode: "server" });
    expect(createAuditEntry).not.toHaveBeenCalled();
    expect(consoleErr).toHaveBeenCalled();
    consoleErr.mockRestore();
  });
});
