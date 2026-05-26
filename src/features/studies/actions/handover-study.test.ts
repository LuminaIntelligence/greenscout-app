import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/repositories/study.repository", () => ({
  findStudyById: vi.fn(),
  transferStudy: vi.fn(),
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  findUserById: vi.fn(),
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
import { findStudyById, transferStudy } from "@/lib/repositories/study.repository";
import { findUserById } from "@/lib/repositories/user.repository";

import { handoverStudyAction } from "./handover-study";

const mockedAuth = vi.mocked(auth) as unknown as ReturnType<typeof vi.fn<() => Promise<unknown>>>;

const OWNER_SESSION = {
  user: {
    id: "user-1",
    email: "owner@example.com",
    role: "BERATER" as const,
    mustChangePassword: false,
    formPreference: "WIZARD" as const,
    organizationId: "greenscout",
  },
  expires: "2099-01-01T00:00:00.000Z",
};

const ADMIN_SESSION = {
  ...OWNER_SESSION,
  user: { ...OWNER_SESSION.user, id: "admin-1", role: "ADMIN" as const },
};

const STUDY = {
  id: "study-1",
  consultantId: "user-1",
  organizationId: "greenscout",
};

const TARGET_USER = {
  id: "user-2",
  email: "target@example.com",
  role: "BERATER" as const,
  organizationId: "greenscout",
  active: true,
  deletedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  headersStore.clear();
  mockedAuth.mockResolvedValue(OWNER_SESSION);
  vi.mocked(findStudyById).mockResolvedValue(STUDY as never);
  vi.mocked(findUserById).mockResolvedValue(TARGET_USER as never);
  vi.mocked(transferStudy).mockResolvedValue({
    ...STUDY,
    consultantId: "user-2",
  } as never);
});

describe("handoverStudyAction", () => {
  it("returns validation when envelope is missing studyId", async () => {
    const result = await handoverStudyAction({ studyId: "", newConsultantId: "user-2" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("validation");
  });

  it("returns validation when envelope is missing newConsultantId", async () => {
    const result = await handoverStudyAction({ studyId: "study-1", newConsultantId: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("validation");
  });

  it("returns forbidden when no session", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await handoverStudyAction({ studyId: "study-1", newConsultantId: "user-2" });
    expect(result).toEqual({ ok: false, errorCode: "forbidden" });
  });

  it("returns not-found when study missing", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce(null);
    const result = await handoverStudyAction({ studyId: "study-x", newConsultantId: "user-2" });
    expect(result).toEqual({ ok: false, errorCode: "not-found" });
  });

  it("returns forbidden when BERATER targets another consultant's study", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...STUDY,
      consultantId: "user-99",
    } as never);
    const result = await handoverStudyAction({ studyId: "study-1", newConsultantId: "user-2" });
    expect(result).toEqual({ ok: false, errorCode: "forbidden" });
  });

  it("returns target-not-found when target user does not exist", async () => {
    vi.mocked(findUserById).mockResolvedValueOnce(null);
    const result = await handoverStudyAction({ studyId: "study-1", newConsultantId: "user-99" });
    expect(result).toEqual({ ok: false, errorCode: "target-not-found" });
  });

  it("returns target-not-eligible when target user is inactive", async () => {
    vi.mocked(findUserById).mockResolvedValueOnce({
      ...TARGET_USER,
      active: false,
    } as never);
    const result = await handoverStudyAction({ studyId: "study-1", newConsultantId: "user-2" });
    expect(result).toEqual({ ok: false, errorCode: "target-not-eligible" });
  });

  it("idempotent short-circuit when newConsultantId equals current owner", async () => {
    const result = await handoverStudyAction({ studyId: "study-1", newConsultantId: "user-1" });
    expect(result).toEqual({ ok: true, studyId: "study-1", newConsultantId: "user-1" });
    expect(findUserById).not.toHaveBeenCalled();
    expect(transferStudy).not.toHaveBeenCalled();
    expect(createAuditEntry).not.toHaveBeenCalled();
  });

  it("happy path: owner hands over to another active berater + writes audit + revalidates", async () => {
    headersStore.set("x-forwarded-for", "10.0.0.1");
    headersStore.set("user-agent", "Mozilla/5.0");
    const result = await handoverStudyAction({ studyId: "study-1", newConsultantId: "user-2" });
    expect(result).toEqual({ ok: true, studyId: "study-1", newConsultantId: "user-2" });
    expect(transferStudy).toHaveBeenCalledWith("greenscout", "study-1", "user-2");
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({
        user: { connect: { id: "user-1" } },
        entityType: "Study",
        entityId: "study-1",
        action: "HANDOVER",
        changeSet: { consultantId: ["user-1", "user-2"] },
        ipAddress: "10.0.0.1",
        userAgent: "Mozilla/5.0",
      }),
    );
  });

  it("absent x-forwarded-for produces null ipAddress + userAgent", async () => {
    await handoverStudyAction({ studyId: "study-1", newConsultantId: "user-2" });
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({ ipAddress: null, userAgent: null }),
    );
  });

  it("ADMIN may hand over another consultant's study (F7)", async () => {
    mockedAuth.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...STUDY,
      consultantId: "user-99", // not the admin
    } as never);
    const result = await handoverStudyAction({ studyId: "study-1", newConsultantId: "user-2" });
    expect(result.ok).toBe(true);
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({
        // Actor is the admin, not the previous owner.
        user: { connect: { id: "admin-1" } },
        changeSet: { consultantId: ["user-99", "user-2"] },
      }),
    );
  });

  it("returns server when transferStudy throws", async () => {
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(transferStudy).mockRejectedValueOnce(new Error("db boom"));
    const result = await handoverStudyAction({ studyId: "study-1", newConsultantId: "user-2" });
    expect(result).toEqual({ ok: false, errorCode: "server" });
    expect(consoleErr).toHaveBeenCalled();
    consoleErr.mockRestore();
  });
});
