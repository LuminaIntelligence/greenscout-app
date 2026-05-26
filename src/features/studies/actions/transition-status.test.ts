import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/repositories/study.repository", async () => {
  // Keep the real `InvalidStudyStatusTransitionError` so `instanceof`
  // checks in transition-status.ts continue to hit.
  const actual = await vi.importActual<typeof import("@/lib/repositories/study.repository")>(
    "@/lib/repositories/study.repository",
  );
  return {
    ...actual,
    findStudyById: vi.fn(),
    setStudyStatus: vi.fn(),
  };
});

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
import {
  findStudyById,
  InvalidStudyStatusTransitionError,
  setStudyStatus,
} from "@/lib/repositories/study.repository";

import { transitionStudyStatusAction } from "./transition-status";

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

const COMPLETE_STUDY = {
  id: "study-1",
  consultantId: "user-1",
  customerId: "cust-1",
  organizationId: "greenscout",
  status: "DRAFT" as const,
  objectName: "Hofgut",
  objectAddress: "Sonnenweg 12",
  objectZipCode: "78462",
  objectCity: "Konstanz",
  flurstueck: "123/4",
  anlageKwp: 100,
  pvErzeugungKwhJahr: 95_000,
  pvEigenverbrauchKwhJahr: 30_000,
  pvVerkaufEurKwh: 0.08,
  verbrauchKwhJahr: 50_000,
  versorgerPreisEurKwh: 0.35,
  pachtEurProKwp: 100,
  vertragslaufzeitJahre: 20,
  modulAnzahl: 200,
  modulFlaecheM2: 400,
  eigenverbrauchsquoteProzent: 65,
  netzeinspeisungKwhJahr: 30_000,
  szenarioPreis1: 0.35,
  szenarioPreis2: 0.4,
  szenarioPreis3: 0.45,
  terminVorschlag1: new Date("2026-06-01T10:00:00"),
  terminVorschlag2: new Date("2026-06-02T10:00:00"),
  deletedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  headersStore.clear();
  mockedAuth.mockResolvedValue(SESSION);
  vi.mocked(findStudyById).mockResolvedValue(COMPLETE_STUDY as never);
  vi.mocked(setStudyStatus).mockResolvedValue({
    ...COMPLETE_STUDY,
    status: "READY",
  } as never);
});

describe("transitionStudyStatusAction", () => {
  it("returns validation when envelope is malformed", async () => {
    const result = await transitionStudyStatusAction({ studyId: "", newStatus: "READY" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("validation");
  });

  it("returns forbidden when no session", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await transitionStudyStatusAction({ studyId: "study-1", newStatus: "READY" });
    expect(result).toEqual({ ok: false, errorCode: "forbidden" });
  });

  it("returns not-found when study missing", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce(null);
    const result = await transitionStudyStatusAction({ studyId: "study-x", newStatus: "READY" });
    expect(result).toEqual({ ok: false, errorCode: "not-found" });
  });

  it("returns forbidden when BERATER targets other's study", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...COMPLETE_STUDY,
      consultantId: "user-2",
    } as never);
    const result = await transitionStudyStatusAction({ studyId: "study-1", newStatus: "READY" });
    expect(result).toEqual({ ok: false, errorCode: "forbidden" });
  });

  it("idempotent no-op when status already at target", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...COMPLETE_STUDY,
      status: "READY",
    } as never);
    const result = await transitionStudyStatusAction({ studyId: "study-1", newStatus: "READY" });
    expect(result).toEqual({ ok: true, studyId: "study-1", status: "READY" });
    expect(setStudyStatus).not.toHaveBeenCalled();
    expect(createAuditEntry).not.toHaveBeenCalled();
  });

  it("flips DRAFT → READY when full schema validates + writes audit + revalidates", async () => {
    headersStore.set("x-forwarded-for", "10.0.0.1");
    headersStore.set("user-agent", "Mozilla/5.0");
    const result = await transitionStudyStatusAction({ studyId: "study-1", newStatus: "READY" });
    expect(result.ok).toBe(true);
    expect(setStudyStatus).toHaveBeenCalledWith("greenscout", "study-1", "READY");
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({
        action: "STATUS_CHANGE",
        changeSet: { status: ["DRAFT", "READY"] },
        ipAddress: "10.0.0.1",
      }),
    );
  });

  it("returns incomplete when DRAFT → READY but a required field is empty", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...COMPLETE_STUDY,
      objectName: "",
    } as never);
    const result = await transitionStudyStatusAction({ studyId: "study-1", newStatus: "READY" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("incomplete");
      expect(result.fieldErrors?.objectName).toBe("studies.error.object-name-required");
    }
    expect(setStudyStatus).not.toHaveBeenCalled();
  });

  it("returns invalid-transition when the repo throws", async () => {
    vi.mocked(setStudyStatus).mockRejectedValueOnce(
      new InvalidStudyStatusTransitionError("READY", "DRAFT"),
    );
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...COMPLETE_STUDY,
      status: "READY",
    } as never);
    const result = await transitionStudyStatusAction({
      studyId: "study-1",
      newStatus: "GENERATED",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("invalid-transition");
  });

  it("returns not-found when setStudyStatus returns null after read", async () => {
    vi.mocked(setStudyStatus).mockResolvedValueOnce(null);
    const result = await transitionStudyStatusAction({ studyId: "study-1", newStatus: "READY" });
    expect(result).toEqual({ ok: false, errorCode: "not-found" });
  });

  it("returns server when setStudyStatus throws a generic error", async () => {
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(setStudyStatus).mockRejectedValueOnce(new Error("db boom"));
    const result = await transitionStudyStatusAction({ studyId: "study-1", newStatus: "READY" });
    expect(result).toEqual({ ok: false, errorCode: "server" });
    expect(consoleErr).toHaveBeenCalled();
    consoleErr.mockRestore();
  });

  it("READY → GENERATED bypasses the studyFullSchema gate", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...COMPLETE_STUDY,
      status: "READY",
      objectName: "", // would fail studyFullSchema, but doesn't matter for GENERATED
    } as never);
    vi.mocked(setStudyStatus).mockResolvedValueOnce({
      ...COMPLETE_STUDY,
      status: "GENERATED",
    } as never);
    const result = await transitionStudyStatusAction({
      studyId: "study-1",
      newStatus: "GENERATED",
    });
    expect(result.ok).toBe(true);
  });

  it("absent x-forwarded-for produces null ipAddress", async () => {
    await transitionStudyStatusAction({ studyId: "study-1", newStatus: "READY" });
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({ ipAddress: null, userAgent: null }),
    );
  });

  it("returns incomplete when DRAFT → READY and step-4 fields are still null", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...COMPLETE_STUDY,
      modulAnzahl: null,
      modulFlaecheM2: null,
      eigenverbrauchsquoteProzent: null,
      netzeinspeisungKwhJahr: null,
      szenarioPreis1: null,
      szenarioPreis2: null,
      szenarioPreis3: null,
      terminVorschlag1: null,
      terminVorschlag2: null,
    } as never);
    const result = await transitionStudyStatusAction({
      studyId: "study-1",
      newStatus: "READY",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("incomplete");
      expect(result.fieldErrors).toBeDefined();
    }
    expect(setStudyStatus).not.toHaveBeenCalled();
  });

  it("ADMIN may transition another consultant's study", async () => {
    mockedAuth.mockResolvedValueOnce({
      ...SESSION,
      user: { ...SESSION.user, role: "ADMIN" as const, id: "admin-1" },
    });
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...COMPLETE_STUDY,
      consultantId: "user-2",
    } as never);
    const result = await transitionStudyStatusAction({ studyId: "study-1", newStatus: "READY" });
    expect(result.ok).toBe(true);
  });
});
