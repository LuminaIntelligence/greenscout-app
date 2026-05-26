import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/repositories/study.repository", () => ({
  findStudyById: vi.fn(),
  softDeleteStudy: vi.fn(),
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
import { findStudyById, softDeleteStudy } from "@/lib/repositories/study.repository";

import { softDeleteStudyAction } from "./soft-delete-study";

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

const STUDY = {
  id: "study-1",
  consultantId: "user-1",
  organizationId: "greenscout",
  deletedAt: null,
};

function asFormData(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  headersStore.clear();
  mockedAuth.mockResolvedValue(SESSION);
  vi.mocked(findStudyById).mockResolvedValue(STUDY as never);
  vi.mocked(softDeleteStudy).mockResolvedValue(STUDY as never);
});

describe("softDeleteStudyAction", () => {
  it("returns server when studyId missing from FormData", async () => {
    const result = await softDeleteStudyAction(asFormData({}));
    expect(result).toEqual({ ok: false, errorCode: "server" });
    expect(findStudyById).not.toHaveBeenCalled();
  });

  it("returns server when no session", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await softDeleteStudyAction(asFormData({ studyId: "study-1" }));
    expect(result).toEqual({ ok: false, errorCode: "server" });
  });

  it("returns not-found when the study does not exist", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce(null);
    const result = await softDeleteStudyAction(asFormData({ studyId: "study-x" }));
    expect(result).toEqual({ ok: false, errorCode: "not-found" });
  });

  it("returns forbidden when BERATER targets other's study", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...STUDY,
      consultantId: "user-2",
    } as never);
    const result = await softDeleteStudyAction(asFormData({ studyId: "study-1" }));
    expect(result).toEqual({ ok: false, errorCode: "forbidden" });
  });

  it("idempotent when already soft-deleted (no second audit row)", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...STUDY,
      deletedAt: new Date(),
    } as never);
    const result = await softDeleteStudyAction(asFormData({ studyId: "study-1" }));
    expect(result).toEqual({ ok: true, studyId: "study-1" });
    expect(softDeleteStudy).not.toHaveBeenCalled();
    expect(createAuditEntry).not.toHaveBeenCalled();
  });

  it("soft-deletes + writes SOFT_DELETE audit + revalidates", async () => {
    headersStore.set("x-forwarded-for", "10.0.0.1");
    headersStore.set("user-agent", "Mozilla/5.0");
    const result = await softDeleteStudyAction(asFormData({ studyId: "study-1" }));
    expect(result).toEqual({ ok: true, studyId: "study-1" });
    expect(softDeleteStudy).toHaveBeenCalledWith("greenscout", "study-1", expect.any(Date));
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({
        action: "SOFT_DELETE",
        entityType: "Study",
        entityId: "study-1",
        ipAddress: "10.0.0.1",
      }),
    );
  });

  it("treats softDeleteStudy returning null as idempotent success (race-loss)", async () => {
    vi.mocked(softDeleteStudy).mockResolvedValueOnce(null);
    const result = await softDeleteStudyAction(asFormData({ studyId: "study-1" }));
    expect(result).toEqual({ ok: true, studyId: "study-1" });
    expect(createAuditEntry).not.toHaveBeenCalled();
  });

  it("returns server when softDeleteStudy throws", async () => {
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(softDeleteStudy).mockRejectedValueOnce(new Error("db boom"));
    const result = await softDeleteStudyAction(asFormData({ studyId: "study-1" }));
    expect(result).toEqual({ ok: false, errorCode: "server" });
    expect(consoleErr).toHaveBeenCalled();
    consoleErr.mockRestore();
  });

  it("ADMIN may delete another consultant's study", async () => {
    mockedAuth.mockResolvedValueOnce({
      ...SESSION,
      user: { ...SESSION.user, role: "ADMIN" as const, id: "admin-1" },
    });
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...STUDY,
      consultantId: "user-2",
    } as never);
    const result = await softDeleteStudyAction(asFormData({ studyId: "study-1" }));
    expect(result.ok).toBe(true);
  });

  it("absent x-forwarded-for produces null ipAddress", async () => {
    await softDeleteStudyAction(asFormData({ studyId: "study-1" }));
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({ ipAddress: null, userAgent: null }),
    );
  });
});
