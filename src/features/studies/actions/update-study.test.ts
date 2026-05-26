import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/repositories/study.repository", () => ({
  findStudyById: vi.fn(),
  updateStudy: vi.fn(),
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
import { findStudyById, updateStudy } from "@/lib/repositories/study.repository";

import { updateStudyAction } from "./update-study";

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

const ADMIN_SESSION = {
  ...SESSION,
  user: { ...SESSION.user, role: "ADMIN" as const, id: "admin-1" },
};

const EXISTING_STUDY = {
  id: "study-1",
  consultantId: "user-1",
  customerId: "cust-1",
  organizationId: "greenscout",
  status: "DRAFT" as const,
  objectName: "",
  objectAddress: "",
  objectZipCode: "",
  objectCity: "",
  flurstueck: "",
  anlageKwp: 0,
  pvErzeugungKwhJahr: 0,
  pvEigenverbrauchKwhJahr: 0,
  pvVerkaufEurKwh: 0,
  verbrauchKwhJahr: 0,
  versorgerPreisEurKwh: 0,
  pachtEurProKwp: 100,
  vertragslaufzeitJahre: 20,
  modulAnzahl: null,
  modulFlaecheM2: null,
  eigenverbrauchsquoteProzent: null,
  netzeinspeisungKwhJahr: null,
  szenarioPreis1: 0.35,
  szenarioPreis2: 0.4,
  szenarioPreis3: 0.45,
  terminVorschlag1: null,
  terminVorschlag2: null,
  deletedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  headersStore.clear();
  mockedAuth.mockResolvedValue(SESSION);
  vi.mocked(findStudyById).mockResolvedValue(EXISTING_STUDY as never);
  vi.mocked(updateStudy).mockResolvedValue(EXISTING_STUDY as never);
});

describe("updateStudyAction", () => {
  it("returns server when the envelope is malformed", async () => {
    const result = await updateStudyAction({ studyId: "", stepKey: "stepX", data: {} });
    expect(result).toEqual({ ok: false, errorCode: "server" });
    expect(findStudyById).not.toHaveBeenCalled();
  });

  it("returns forbidden when no session is present", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await updateStudyAction({
      studyId: "study-1",
      stepKey: "step2",
      data: { objectName: "X" },
    });
    expect(result).toEqual({ ok: false, errorCode: "forbidden" });
  });

  it("returns validation with fieldErrors when the step payload fails", async () => {
    const result = await updateStudyAction({
      studyId: "study-1",
      stepKey: "step2",
      data: { objectName: "" },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe("validation");
    expect(result.fieldErrors?.objectName).toBe("studies.error.object-name-required");
  });

  it("returns not-found when the study does not exist", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce(null);
    const result = await updateStudyAction({
      studyId: "study-x",
      stepKey: "step2",
      data: {
        objectName: "Hof",
        objectAddress: "Weg 1",
        objectZipCode: "12345",
        objectCity: "Berlin",
        flurstueck: "1/2",
      },
    });
    expect(result).toEqual({ ok: false, errorCode: "not-found" });
  });

  it("returns forbidden when BERATER tries to edit another consultant's study", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...EXISTING_STUDY,
      consultantId: "user-2",
    } as never);
    const result = await updateStudyAction({
      studyId: "study-1",
      stepKey: "step2",
      data: {
        objectName: "Hof",
        objectAddress: "Weg 1",
        objectZipCode: "12345",
        objectCity: "Berlin",
        flurstueck: "1/2",
      },
    });
    expect(result).toEqual({ ok: false, errorCode: "forbidden" });
  });

  it("allows ADMIN to edit another consultant's study", async () => {
    mockedAuth.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...EXISTING_STUDY,
      consultantId: "user-2",
    } as never);
    const result = await updateStudyAction({
      studyId: "study-1",
      stepKey: "step2",
      data: {
        objectName: "Hof",
        objectAddress: "Weg 1",
        objectZipCode: "12345",
        objectCity: "Berlin",
        flurstueck: "1/2",
      },
    });
    expect(result.ok).toBe(true);
  });

  it("writes step-2 update + audit diff + revalidates", async () => {
    headersStore.set("x-forwarded-for", "10.0.0.1");
    headersStore.set("user-agent", "Mozilla/5.0");

    const result = await updateStudyAction({
      studyId: "study-1",
      stepKey: "step2",
      data: {
        objectName: "Hofgut",
        objectAddress: "Sonnenweg 12",
        objectZipCode: "78462",
        objectCity: "Konstanz",
        flurstueck: "123/4",
      },
    });

    expect(result).toEqual({ ok: true, studyId: "study-1" });
    expect(updateStudy).toHaveBeenCalledWith(
      "greenscout",
      "study-1",
      expect.objectContaining({ objectName: "Hofgut" }),
    );
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({
        entityType: "Study",
        action: "UPDATE",
        changeSet: expect.objectContaining({
          objectName: ["", "Hofgut"],
          flurstueck: ["", "123/4"],
        }),
      }),
    );
  });

  it("returns no-op (no write) when step data equals current state", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...EXISTING_STUDY,
      objectName: "Hofgut",
      objectAddress: "Sonnenweg 12",
      objectZipCode: "78462",
      objectCity: "Konstanz",
      flurstueck: "123/4",
    } as never);

    const result = await updateStudyAction({
      studyId: "study-1",
      stepKey: "step2",
      data: {
        objectName: "Hofgut",
        objectAddress: "Sonnenweg 12",
        objectZipCode: "78462",
        objectCity: "Konstanz",
        flurstueck: "123/4",
      },
    });
    expect(result).toEqual({ ok: true, studyId: "study-1" });
    expect(updateStudy).not.toHaveBeenCalled();
    expect(createAuditEntry).not.toHaveBeenCalled();
  });

  it("handles Step 1 customer-connect", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...EXISTING_STUDY,
      customerId: "cust-old",
    } as never);
    const result = await updateStudyAction({
      studyId: "study-1",
      stepKey: "step1",
      data: { customerId: "cust-new" },
    });
    expect(result.ok).toBe(true);
    expect(updateStudy).toHaveBeenCalledWith(
      "greenscout",
      "study-1",
      expect.objectContaining({ customer: { connect: { id: "cust-new" } } }),
    );
  });

  it("Step 1 no-op when customerId unchanged", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...EXISTING_STUDY,
      customerId: "cust-1",
    } as never);
    const result = await updateStudyAction({
      studyId: "study-1",
      stepKey: "step1",
      data: { customerId: "cust-1" },
    });
    expect(result.ok).toBe(true);
    expect(updateStudy).not.toHaveBeenCalled();
  });

  it("returns server when the repository throws", async () => {
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(updateStudy).mockRejectedValueOnce(new Error("db boom"));

    const result = await updateStudyAction({
      studyId: "study-1",
      stepKey: "step2",
      data: {
        objectName: "Hof",
        objectAddress: "Weg 1",
        objectZipCode: "12345",
        objectCity: "Berlin",
        flurstueck: "1/2",
      },
    });

    expect(result).toEqual({ ok: false, errorCode: "server" });
    expect(consoleErr).toHaveBeenCalled();
    consoleErr.mockRestore();
  });

  it("absent x-forwarded-for produces null ipAddress in audit", async () => {
    await updateStudyAction({
      studyId: "study-1",
      stepKey: "step2",
      data: {
        objectName: "Hof",
        objectAddress: "Weg 1",
        objectZipCode: "12345",
        objectCity: "Berlin",
        flurstueck: "1/2",
      },
    });
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({ ipAddress: null }),
    );
  });

  it("handles Step 3 PV-inputs payload (Decimal diff)", async () => {
    const result = await updateStudyAction({
      studyId: "study-1",
      stepKey: "step3",
      data: {
        anlageKwp: 150,
        pvErzeugungKwhJahr: 130_000,
        pvEigenverbrauchKwhJahr: 40_000,
        pvVerkaufEurKwh: 0.08,
        verbrauchKwhJahr: 60_000,
        versorgerPreisEurKwh: 0.35,
        pachtEurProKwp: 110,
        vertragslaufzeitJahre: 25,
      },
    });
    expect(result.ok).toBe(true);
    expect(updateStudy).toHaveBeenCalled();
  });

  it("handles Step 6 termine payload (Date diff)", async () => {
    const result = await updateStudyAction({
      studyId: "study-1",
      stepKey: "step6",
      data: {
        terminVorschlag1: "2026-06-01T10:00:00",
        terminVorschlag2: "2026-06-02T10:00:00",
      },
    });
    expect(result.ok).toBe(true);
  });

  it("normalises Prisma Decimal-like values via toString() for the diff", async () => {
    // Simulate Prisma's Decimal class: an object that stringifies via
    // toString() instead of being a plain JS number.
    const decimalLike = {
      toString: () => "100",
    };
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...EXISTING_STUDY,
      anlageKwp: decimalLike,
    } as never);
    const result = await updateStudyAction({
      studyId: "study-1",
      stepKey: "step3",
      data: {
        anlageKwp: 150,
        pvErzeugungKwhJahr: 130_000,
        pvEigenverbrauchKwhJahr: 40_000,
        pvVerkaufEurKwh: 0.08,
        verbrauchKwhJahr: 60_000,
        versorgerPreisEurKwh: 0.35,
        pachtEurProKwp: 110,
        vertragslaufzeitJahre: 25,
      },
    });
    expect(result.ok).toBe(true);
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({
        changeSet: expect.objectContaining({
          anlageKwp: ["100", 150],
        }),
      }),
    );
  });

  it("normaliseForDiff returns null for unsupported types", async () => {
    // Force the existing row to have a non-Date / non-primitive /
    // non-toString-bearing value. Symbol has no toString-in pattern.
    const weird = Symbol("weird");
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...EXISTING_STUDY,
      // Inject a value that survives the type-narrowing checks but
      // doesn't pass the "object && toString in value" branch.
      objectName: weird as unknown as string,
    } as never);
    const result = await updateStudyAction({
      studyId: "study-1",
      stepKey: "step2",
      data: {
        objectName: "Hofgut",
        objectAddress: "Sonnenweg 12",
        objectZipCode: "78462",
        objectCity: "Konstanz",
        flurstueck: "123/4",
      },
    });
    expect(result.ok).toBe(true);
  });
});
