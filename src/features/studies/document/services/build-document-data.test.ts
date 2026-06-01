import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/study.repository", () => ({
  findStudyById: vi.fn(),
}));

vi.mock("@/lib/repositories/customer.repository", () => ({
  findCustomerById: vi.fn(),
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  findUserById: vi.fn(),
}));

vi.mock("@/lib/repositories/study-image.repository", () => ({
  listStudyImages: vi.fn(),
}));

import { findCustomerById } from "@/lib/repositories/customer.repository";
import { findStudyById } from "@/lib/repositories/study.repository";
import { listStudyImages } from "@/lib/repositories/study-image.repository";
import { findUserById } from "@/lib/repositories/user.repository";

import { buildStudyDocumentData } from "./build-document-data";

const ORG = "greenscout";
const STUDY_ID = "study-001";

function fakeStudy(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: STUDY_ID,
    consultantId: "user-1",
    customerId: "cust-1",
    status: "READY",
    objectName: "Linzgau Center",
    objectAddress: "Bergwaldstraße 4",
    objectZipCode: "88630",
    objectCity: "Pfullendorf",
    flurstueck: "78.10",
    anlageKwp: 500,
    pvErzeugungKwhJahr: 472000,
    pvEigenverbrauchKwhJahr: 164000,
    pvVerkaufEurKwh: 0.22,
    verbrauchKwhJahr: 400000,
    versorgerPreisEurKwh: 0.35,
    pachtEurProKwp: 100,
    vertragslaufzeitJahre: 20,
    modulAnzahl: 1428,
    modulFlaecheM2: 2856,
    eigenverbrauchsquoteProzent: 41,
    netzeinspeisungKwhJahr: 308000,
    szenarioPreis1: 0.35,
    szenarioPreis2: 0.4,
    szenarioPreis3: 0.45,
    terminVorschlag1: new Date("2026-03-15T14:00:00.000Z"),
    terminVorschlag2: new Date("2026-03-16T14:00:00.000Z"),
    co2Override: false,
    co2TonnenProJahr: null,
    co2HektarMischwald: null,
    co2FussballfelderProJahr: null,
    organizationId: ORG,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    generatedAt: null,
    ...overrides,
  };
}

function fakeCustomer(): Record<string, unknown> {
  return {
    id: "cust-1",
    contactFirstName: "Sven",
    contactLastName: "Smolka",
    companyName: "Linzgau Center GmbH",
    email: "sven@linzgau.example.de",
    phone: null,
    billingAddress: null,
    billingZipCode: null,
    billingCity: null,
    notes: null,
    organizationId: ORG,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

function fakeConsultant(): Record<string, unknown> {
  return {
    id: "user-1",
    email: "bernd@greenscout.de",
    passwordHash: "hash",
    passwordChangedAt: null,
    role: "BERATER",
    firstName: "Bernd",
    lastName: "Berater",
    phone: "+49 172 1234567",
    mobile: null,
    addressLine: "Utechter Str. 5, 19217 Utecht",
    signaturePhotoUrl: null,
    mustChangePassword: false,
    failedLoginCount: 0,
    lockoutUntil: null,
    formPreference: "WIZARD",
    active: true,
    organizationId: ORG,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildStudyDocumentData", () => {
  it("returns null when the study is missing", async () => {
    vi.mocked(findStudyById).mockResolvedValue(null);
    const result = await buildStudyDocumentData(ORG, STUDY_ID);
    expect(result).toBeNull();
    expect(findCustomerById).not.toHaveBeenCalled();
    expect(findUserById).not.toHaveBeenCalled();
    expect(listStudyImages).not.toHaveBeenCalled();
  });

  it("returns null when the customer is missing", async () => {
    vi.mocked(findStudyById).mockResolvedValue(fakeStudy() as never);
    vi.mocked(findCustomerById).mockResolvedValue(null);
    const result = await buildStudyDocumentData(ORG, STUDY_ID);
    expect(result).toBeNull();
    expect(findUserById).not.toHaveBeenCalled();
  });

  it("returns null when the consultant is missing", async () => {
    vi.mocked(findStudyById).mockResolvedValue(fakeStudy() as never);
    vi.mocked(findCustomerById).mockResolvedValue(fakeCustomer() as never);
    vi.mocked(findUserById).mockResolvedValue(null);
    const result = await buildStudyDocumentData(ORG, STUDY_ID);
    expect(result).toBeNull();
  });

  it("composes derived values and maps image URLs when both BEFORE and AFTER are uploaded", async () => {
    vi.mocked(findStudyById).mockResolvedValue(fakeStudy() as never);
    vi.mocked(findCustomerById).mockResolvedValue(fakeCustomer() as never);
    vi.mocked(findUserById).mockResolvedValue(fakeConsultant() as never);
    vi.mocked(listStudyImages).mockResolvedValue([
      {
        id: "img-before",
        studyId: STUDY_ID,
        type: "BEFORE",
        filename: "before.jpg",
        mimeType: "image/jpeg",
        widthPx: 1920,
        heightPx: 1080,
        fileSizeBytes: 200_000,
        uploadedAt: new Date(),
      },
      {
        id: "img-after",
        studyId: STUDY_ID,
        type: "AFTER",
        filename: "after.jpg",
        mimeType: "image/jpeg",
        widthPx: 1920,
        heightPx: 1080,
        fileSizeBytes: 210_000,
        uploadedAt: new Date(),
      },
    ] as never);

    const result = await buildStudyDocumentData(ORG, STUDY_ID);
    expect(result).not.toBeNull();
    expect(result?.study.id).toBe(STUDY_ID);
    expect(result?.customer.contactLastName).toBe("Smolka");
    expect(result?.consultant.firstName).toBe("Bernd");
    expect(result?.images.beforeUrl).toBe("/api/uploads/img-before");
    expect(result?.images.afterUrl).toBe("/api/uploads/img-after");
    // Derived values calculated via composeAll
    // ersparnisProJahr = (0.35 - 0.22) * 164000 = 21320
    expect(result?.derived.ersparnisProJahr).toBeCloseTo(21320, 1);
    // pachtEinnahmeEinmalig = 500 * 100 = 50000 (SPEC §4.7 one-shot)
    expect(result?.derived.pachtEinnahmeEinmalig).toBe(50000);
    // gesamterzeugung20j = 472000 * 20
    expect(result?.derived.gesamterzeugung20j).toBe(472000 * 20);
  });

  it("returns null image URLs when neither slot is uploaded", async () => {
    vi.mocked(findStudyById).mockResolvedValue(fakeStudy() as never);
    vi.mocked(findCustomerById).mockResolvedValue(fakeCustomer() as never);
    vi.mocked(findUserById).mockResolvedValue(fakeConsultant() as never);
    vi.mocked(listStudyImages).mockResolvedValue([] as never);

    const result = await buildStudyDocumentData(ORG, STUDY_ID);
    expect(result?.images.beforeUrl).toBeNull();
    expect(result?.images.afterUrl).toBeNull();
  });

  it("returns BEFORE-only when AFTER is missing", async () => {
    vi.mocked(findStudyById).mockResolvedValue(fakeStudy() as never);
    vi.mocked(findCustomerById).mockResolvedValue(fakeCustomer() as never);
    vi.mocked(findUserById).mockResolvedValue(fakeConsultant() as never);
    vi.mocked(listStudyImages).mockResolvedValue([
      {
        id: "img-before",
        studyId: STUDY_ID,
        type: "BEFORE",
        filename: "before.jpg",
        mimeType: "image/jpeg",
        widthPx: 100,
        heightPx: 100,
        fileSizeBytes: 1000,
        uploadedAt: new Date(),
      },
    ] as never);

    const result = await buildStudyDocumentData(ORG, STUDY_ID);
    expect(result?.images.beforeUrl).toBe("/api/uploads/img-before");
    expect(result?.images.afterUrl).toBeNull();
  });

  it("honours co2Override values when set", async () => {
    vi.mocked(findStudyById).mockResolvedValue(
      fakeStudy({
        co2Override: true,
        co2TonnenProJahr: 200,
        co2HektarMischwald: 80,
        co2FussballfelderProJahr: 100,
      }) as never,
    );
    vi.mocked(findCustomerById).mockResolvedValue(fakeCustomer() as never);
    vi.mocked(findUserById).mockResolvedValue(fakeConsultant() as never);
    vi.mocked(listStudyImages).mockResolvedValue([] as never);

    const result = await buildStudyDocumentData(ORG, STUDY_ID);
    expect(result?.derived.co2TonnenProJahr).toBe(200);
    expect(result?.derived.co2HektarMischwald).toBe(80);
    expect(result?.derived.co2FussballfelderProJahr).toBe(100);
  });

  it("propagates organizationId to all repository calls for multi-tenant safety", async () => {
    vi.mocked(findStudyById).mockResolvedValue(fakeStudy() as never);
    vi.mocked(findCustomerById).mockResolvedValue(fakeCustomer() as never);
    vi.mocked(findUserById).mockResolvedValue(fakeConsultant() as never);
    vi.mocked(listStudyImages).mockResolvedValue([] as never);

    await buildStudyDocumentData(ORG, STUDY_ID);

    expect(findStudyById).toHaveBeenCalledWith(ORG, STUDY_ID);
    expect(findCustomerById).toHaveBeenCalledWith(ORG, "cust-1");
    expect(findUserById).toHaveBeenCalledWith(ORG, "user-1");
    expect(listStudyImages).toHaveBeenCalledWith(STUDY_ID);
  });
});
