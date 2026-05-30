import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/repositories/study.repository", () => ({
  findStudyById: vi.fn(),
  markStudyGenerated: vi.fn(),
}));

vi.mock("@/lib/repositories/customer.repository", () => ({
  findCustomerById: vi.fn(),
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  findUserById: vi.fn(),
}));

vi.mock("@/lib/repositories/generated-document.repository", () => ({
  createDocument: vi.fn(),
}));

vi.mock("@/lib/repositories/audit-log.repository", () => ({
  createAuditEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/repositories/study-image.repository", () => ({
  listStudyImages: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/python-service-client", () => ({
  callDocumentsGenerate: vi.fn(),
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
import { callDocumentsGenerate } from "@/lib/python-service-client";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { findCustomerById } from "@/lib/repositories/customer.repository";
import { createDocument } from "@/lib/repositories/generated-document.repository";
import { findStudyById, markStudyGenerated } from "@/lib/repositories/study.repository";
import { listStudyImages } from "@/lib/repositories/study-image.repository";
import { findUserById } from "@/lib/repositories/user.repository";

import { generateDocumentAction } from "./generate-document";
import {
  buildFlurstueckLabelPhrase,
  buildFlurstueckPhrase,
  buildModulInfoPhrase,
  buildTerminOderPhrase,
  buildTerminPhrase,
} from "./generate-document-phrases";

const mockedAuth = vi.mocked(auth) as unknown as ReturnType<typeof vi.fn<() => Promise<unknown>>>;
const mockedCallDocumentsGenerate = vi.mocked(callDocumentsGenerate);

const SESSION_BERATER = {
  user: {
    id: "user-1",
    email: "berater@example.com",
    role: "BERATER" as const,
    organizationId: "greenscout",
  },
  expires: "2099-01-01T00:00:00.000Z",
};

const SESSION_ADMIN = {
  user: {
    id: "admin-1",
    email: "admin@example.com",
    role: "ADMIN" as const,
    organizationId: "greenscout",
  },
  expires: "2099-01-01T00:00:00.000Z",
};

const READY_STUDY = {
  id: "study-1",
  consultantId: "user-1",
  customerId: "cust-1",
  organizationId: "greenscout",
  status: "READY" as const,
  objectName: "Hofgut Beispiel",
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
  co2Override: false,
  co2TonnenProJahr: null,
  co2HektarMischwald: null,
  co2FussballfelderProJahr: null,
};

const CUSTOMER = {
  id: "cust-1",
  contactFirstName: "Erika",
  contactLastName: "Musterkundin",
};

const CONSULTANT = {
  id: "user-1",
  firstName: "Bernd",
  lastName: "Berater",
  email: "berater@example.com",
};

const PY_OK = {
  ok: true as const,
  data: {
    pptxPath: "/app/generated/Erika/20260526T120000/Erika_Hofgut.pptx",
    pdfPath: "/app/generated/Erika/20260526T120000/Erika_Hofgut.pdf",
    generatedAt: "2026-05-26T12:00:00Z",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  headersStore.clear();
  mockedAuth.mockResolvedValue(SESSION_BERATER);
  vi.mocked(findStudyById).mockResolvedValue(READY_STUDY as never);
  vi.mocked(findCustomerById).mockResolvedValue(CUSTOMER as never);
  vi.mocked(findUserById).mockResolvedValue(CONSULTANT as never);
  mockedCallDocumentsGenerate.mockResolvedValue(PY_OK);
  vi.mocked(createDocument)
    .mockResolvedValueOnce({ id: "doc-pptx-1" } as never)
    .mockResolvedValueOnce({ id: "doc-pdf-1" } as never);
  vi.mocked(markStudyGenerated).mockResolvedValue({
    ...READY_STUDY,
    status: "GENERATED",
  } as never);
});

describe("generateDocumentAction", () => {
  it("returns validation when envelope malformed", async () => {
    const result = await generateDocumentAction({ studyId: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("validation");
  });

  it("returns validation when input not an object", async () => {
    const result = await generateDocumentAction("garbage");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("validation");
  });

  it("returns forbidden when no session", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result).toEqual({ ok: false, errorCode: "forbidden" });
  });

  it("returns not-found when study missing", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce(null);
    const result = await generateDocumentAction({ studyId: "study-x" });
    expect(result).toEqual({ ok: false, errorCode: "not-found" });
  });

  it("returns forbidden when BERATER targets other's study", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...READY_STUDY,
      consultantId: "user-2",
    } as never);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result).toEqual({ ok: false, errorCode: "forbidden" });
  });

  it("admin can generate on someone else's study", async () => {
    mockedAuth.mockResolvedValueOnce(SESSION_ADMIN);
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...READY_STUDY,
      consultantId: "user-2",
    } as never);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result.ok).toBe(true);
  });

  it("returns incomplete when study is still in DRAFT", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...READY_STUDY,
      status: "DRAFT",
    } as never);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result).toEqual({ ok: false, errorCode: "incomplete" });
  });

  it("returns not-found when customer missing", async () => {
    vi.mocked(findCustomerById).mockResolvedValueOnce(null);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result).toEqual({ ok: false, errorCode: "not-found" });
  });

  it("returns not-found when consultant missing", async () => {
    vi.mocked(findUserById).mockResolvedValueOnce(null);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result).toEqual({ ok: false, errorCode: "not-found" });
  });

  it("returns pyservice errorCode when python service fails", async () => {
    mockedCallDocumentsGenerate.mockResolvedValueOnce({
      ok: false,
      kind: "server-error",
      message: "boom",
    });
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("pyservice");
      expect(result.message).toBe("boom");
    }
  });

  it("happy path: creates PPTX + PDF docs, marks generated, writes audit", async () => {
    headersStore.set("x-forwarded-for", "192.0.2.7, 10.0.0.1");
    headersStore.set("user-agent", "Test-Agent/1.0");

    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pptxDocumentId).toBe("doc-pptx-1");
      expect(result.pdfDocumentId).toBe("doc-pdf-1");
    }

    expect(createDocument).toHaveBeenCalledTimes(2);
    const calls = vi.mocked(createDocument).mock.calls;
    const formats = calls.map((c) => (c[1] as { format: string }).format);
    expect(formats).toContain("PPTX");
    expect(formats).toContain("PDF");

    expect(markStudyGenerated).toHaveBeenCalledWith("greenscout", "study-1");

    expect(createAuditEntry).toHaveBeenCalledTimes(1);
    const auditCall = vi.mocked(createAuditEntry).mock.calls[0];
    expect(auditCall[0]).toBe("greenscout");
    expect(auditCall[1].action).toBe("GENERATE_DOCUMENT");
    expect(auditCall[1].entityType).toBe("Study");
    expect(auditCall[1].entityId).toBe("study-1");
    expect(auditCall[1].ipAddress).toBe("192.0.2.7");
    expect(auditCall[1].userAgent).toBe("Test-Agent/1.0");
  });

  it("falls back to email if consultant has no first/last name", async () => {
    vi.mocked(findUserById).mockResolvedValueOnce({
      ...CONSULTANT,
      firstName: "",
      lastName: "",
    } as never);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result.ok).toBe(true);
    const call = mockedCallDocumentsGenerate.mock.calls[0][0];
    expect(call.consultantName).toBe("berater@example.com");
  });

  it("uses 'Kunde' fallback when customer name is empty", async () => {
    vi.mocked(findCustomerById).mockResolvedValueOnce({
      ...CUSTOMER,
      contactFirstName: "",
      contactLastName: "",
    } as never);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result.ok).toBe(true);
    const call = mockedCallDocumentsGenerate.mock.calls[0][0];
    expect(call.customerName).toBe("Kunde");
  });

  it("uses 'Studie' fallback when object name is empty", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...READY_STUDY,
      objectName: "",
    } as never);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result.ok).toBe(true);
    const call = mockedCallDocumentsGenerate.mock.calls[0][0];
    expect(call.objectName).toBe("Studie");
  });

  it("propagates co2Override values to the calc input", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...READY_STUDY,
      co2Override: true,
      co2TonnenProJahr: 42,
      co2HektarMischwald: 0.5,
      co2FussballfelderProJahr: 1.5,
    } as never);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result.ok).toBe(true);
    const call = mockedCallDocumentsGenerate.mock.calls[0][0];
    expect(call.study.co2Override).toBe(true);
    expect(call.study.co2TonnenProJahrOverride).toBe(42);
    expect(call.derivedValues.co2TonnenProJahr).toBe(42);
  });

  it("returns server when an unexpected exception bubbles up", async () => {
    vi.mocked(createDocument).mockReset();
    vi.mocked(createDocument).mockRejectedValueOnce(new Error("db down"));
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result).toEqual({ ok: false, errorCode: "server" });
  });

  it("handles missing headers gracefully", async () => {
    // headersStore left empty -- both ipAddress and userAgent should be null.
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result.ok).toBe(true);
    const auditCall = vi.mocked(createAuditEntry).mock.calls[0];
    expect(auditCall[1].ipAddress).toBeNull();
    expect(auditCall[1].userAgent).toBeNull();
  });

  it("passes BEFORE / AFTER image paths to the python service when present (Slice 4)", async () => {
    vi.mocked(listStudyImages).mockResolvedValueOnce([
      {
        id: "img-b",
        studyId: "study-1",
        type: "BEFORE",
        filename: "/app/uploads/studies/study-1/before-uuid.jpg",
        mimeType: "image/jpeg",
        widthPx: 2000,
        heightPx: 1200,
        fileSizeBytes: 200_000,
        uploadedAt: new Date(),
      },
      {
        id: "img-a",
        studyId: "study-1",
        type: "AFTER",
        filename: "/app/uploads/studies/study-1/after-uuid.jpg",
        mimeType: "image/jpeg",
        widthPx: 2000,
        heightPx: 1200,
        fileSizeBytes: 220_000,
        uploadedAt: new Date(),
      },
    ] as never);

    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result.ok).toBe(true);
    const call = mockedCallDocumentsGenerate.mock.calls[0][0];
    expect(call.imageBeforePath).toBe("/app/uploads/studies/study-1/before-uuid.jpg");
    expect(call.imageAfterPath).toBe("/app/uploads/studies/study-1/after-uuid.jpg");
  });

  it("passes only the present image path when the other slot is empty", async () => {
    vi.mocked(listStudyImages).mockResolvedValueOnce([
      {
        id: "img-b",
        studyId: "study-1",
        type: "BEFORE",
        filename: "/app/uploads/studies/study-1/before-uuid.jpg",
        mimeType: "image/jpeg",
        widthPx: 1024,
        heightPx: 768,
        fileSizeBytes: 50_000,
        uploadedAt: new Date(),
      },
    ] as never);

    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result.ok).toBe(true);
    const call = mockedCallDocumentsGenerate.mock.calls[0][0];
    expect(call.imageBeforePath).toBe("/app/uploads/studies/study-1/before-uuid.jpg");
    expect(call.imageAfterPath).toBeNull();
  });

  it("falls back to null image paths when no StudyImage rows exist", async () => {
    vi.mocked(listStudyImages).mockResolvedValueOnce([] as never);

    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result.ok).toBe(true);
    const call = mockedCallDocumentsGenerate.mock.calls[0][0];
    expect(call.imageBeforePath).toBeNull();
    expect(call.imageAfterPath).toBeNull();
  });

  // ----------------------------------------------------------------
  // Defekte D1+D2+D3 — phrase-key generation wiring
  // ----------------------------------------------------------------

  it("D1: passes flurstueck phrases through to the python service when flurstueck is set", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...READY_STUDY,
      flurstueck: "78.10",
    } as never);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result.ok).toBe(true);
    const call = mockedCallDocumentsGenerate.mock.calls[0][0];
    expect(call.flurstueckPhrase).toBe(" in Flurstück 78.10");
    expect(call.flurstueckLabelPhrase).toBe("Flurstück: 78.10");
  });

  it("D1: passes empty flurstueck phrases when flurstueck is blank", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...READY_STUDY,
      flurstueck: "",
    } as never);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result.ok).toBe(true);
    const call = mockedCallDocumentsGenerate.mock.calls[0][0];
    expect(call.flurstueckPhrase).toBe("");
    expect(call.flurstueckLabelPhrase).toBe("");
  });

  it("D2: passes termin phrases when both termine are set", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...READY_STUDY,
      terminVorschlag1: new Date("2026-03-15T14:00:00Z"),
      terminVorschlag2: new Date("2026-03-16T15:30:00Z"),
    } as never);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result.ok).toBe(true);
    const call = mockedCallDocumentsGenerate.mock.calls[0][0];
    expect(call.termin1Phrase).toBe("1) am 15.03.2026 um 14:00 Uhr");
    expect(call.termin2Phrase).toBe("2) am 16.03.2026 um 15:30 Uhr");
    expect(call.terminOderPhrase).toBe("oder");
  });

  it("D2: passes empty termin phrases when both termine are null", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...READY_STUDY,
      terminVorschlag1: null,
      terminVorschlag2: null,
    } as never);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result.ok).toBe(true);
    const call = mockedCallDocumentsGenerate.mock.calls[0][0];
    expect(call.termin1Phrase).toBe("");
    expect(call.termin2Phrase).toBe("");
    expect(call.terminOderPhrase).toBe("");
  });

  it("D3: passes modul_info_phrase with all segments when modul values set", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...READY_STUDY,
      anlageKwp: 500,
      modulAnzahl: 1428,
      modulFlaecheM2: 2856,
    } as never);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result.ok).toBe(true);
    const call = mockedCallDocumentsGenerate.mock.calls[0][0];
    expect(call.modulInfoPhrase).toBe("500 kWp, 1.428 Module, 2.856 m²");
  });

  it("D3: drops Module + m² segments from modul_info_phrase when those values are null", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...READY_STUDY,
      anlageKwp: 500,
      modulAnzahl: null,
      modulFlaecheM2: null,
    } as never);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result.ok).toBe(true);
    const call = mockedCallDocumentsGenerate.mock.calls[0][0];
    expect(call.modulInfoPhrase).toBe("500 kWp");
  });
});

// -------------------------------------------------------------------
// phrase-key generation helpers (Defekte D1+D2+D3)
// -------------------------------------------------------------------

describe("buildFlurstueckPhrase (Defekt D1)", () => {
  it("returns empty string when flurstueck is null", () => {
    expect(buildFlurstueckPhrase(null)).toBe("");
  });

  it("returns empty string when flurstueck is undefined", () => {
    expect(buildFlurstueckPhrase(undefined)).toBe("");
  });

  it("returns empty string when flurstueck is empty string", () => {
    expect(buildFlurstueckPhrase("")).toBe("");
  });

  it("returns empty string when flurstueck is whitespace only", () => {
    expect(buildFlurstueckPhrase("   ")).toBe("");
  });

  it("returns ' in Flurstück <value>' prefix with leading space when set", () => {
    expect(buildFlurstueckPhrase("78.10")).toBe(" in Flurstück 78.10");
  });

  it("trims surrounding whitespace from the flurstueck value", () => {
    expect(buildFlurstueckPhrase("  Fl0234  ")).toBe(" in Flurstück Fl0234");
  });
});

describe("buildFlurstueckLabelPhrase (Defekt D1)", () => {
  it("returns empty string when flurstueck is null", () => {
    expect(buildFlurstueckLabelPhrase(null)).toBe("");
  });

  it("returns empty string when flurstueck is empty", () => {
    expect(buildFlurstueckLabelPhrase("")).toBe("");
  });

  it("returns 'Flurstück: <value>' when set", () => {
    expect(buildFlurstueckLabelPhrase("78.10")).toBe("Flurstück: 78.10");
  });
});

describe("buildTerminPhrase (Defekt D2)", () => {
  it("returns empty string when termin is null", () => {
    expect(buildTerminPhrase(1, null)).toBe("");
  });

  it("returns empty string when termin is undefined", () => {
    expect(buildTerminPhrase(1, undefined)).toBe("");
  });

  it("formats Slot 1 German date+time when set", () => {
    const date = new Date("2026-03-15T14:00:00Z");
    expect(buildTerminPhrase(1, date)).toBe("1) am 15.03.2026 um 14:00 Uhr");
  });

  it("formats Slot 2 German date+time when set", () => {
    const date = new Date("2026-12-09T09:05:00Z");
    expect(buildTerminPhrase(2, date)).toBe("2) am 09.12.2026 um 09:05 Uhr");
  });
});

describe("buildTerminOderPhrase (Defekt D2)", () => {
  it("returns 'oder' only when BOTH termine are set", () => {
    const d1 = new Date("2026-03-15T14:00:00Z");
    const d2 = new Date("2026-03-16T15:00:00Z");
    expect(buildTerminOderPhrase(d1, d2)).toBe("oder");
  });

  it("returns empty when only termin1 is set", () => {
    const d1 = new Date("2026-03-15T14:00:00Z");
    expect(buildTerminOderPhrase(d1, null)).toBe("");
  });

  it("returns empty when only termin2 is set", () => {
    const d2 = new Date("2026-03-16T15:00:00Z");
    expect(buildTerminOderPhrase(null, d2)).toBe("");
  });

  it("returns empty when both are null", () => {
    expect(buildTerminOderPhrase(null, null)).toBe("");
  });

  it("returns empty when both are undefined", () => {
    expect(buildTerminOderPhrase(undefined, undefined)).toBe("");
  });
});

describe("buildModulInfoPhrase (Defekt D3)", () => {
  it("shows only kWp when modul_anzahl + modul_flaeche null", () => {
    expect(buildModulInfoPhrase(500, null, null)).toBe("500 kWp");
  });

  it("shows only kWp when modul_anzahl + modul_flaeche undefined", () => {
    expect(buildModulInfoPhrase(500, undefined, undefined)).toBe("500 kWp");
  });

  it("shows kWp + Module when only modul_anzahl set", () => {
    expect(buildModulInfoPhrase(500, 1428, null)).toBe("500 kWp, 1.428 Module");
  });

  it("shows kWp + m² when only modul_flaeche set", () => {
    expect(buildModulInfoPhrase(500, null, 2856)).toBe("500 kWp, 2.856 m²");
  });

  it("shows all three when all set", () => {
    expect(buildModulInfoPhrase(500, 1428, 2856)).toBe("500 kWp, 1.428 Module, 2.856 m²");
  });

  it("applies German thousands separator to large numbers", () => {
    expect(buildModulInfoPhrase(12500, 35714, 71428)).toBe("12.500 kWp, 35.714 Module, 71.428 m²");
  });

  it("rounds anlage_kwp to integer for the headline", () => {
    expect(buildModulInfoPhrase(257.12, null, null)).toBe("257 kWp");
  });
});
