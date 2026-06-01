/**
 * §7.10-Pivot PR 3 — Tests für die rewireed generate-document Action.
 *
 * Trust-boundary class: input → session → repo lookups → renderStudyToPdf
 * → GeneratedDocument persist + audit + revalidate. 100% Coverage-Threshold
 * (siehe vitest.config.ts) gilt unverändert.
 *
 * Alle Branches:
 *   - schema validation fail
 *   - missing session
 *   - missing study
 *   - canAccessStudy false (foreign BERATER)
 *   - DRAFT-Status gate
 *   - missing customer
 *   - missing consultant
 *   - renderStudyToPdf throws (errorCode: "render")
 *   - happy path BERATER
 *   - happy path ADMIN god-mode
 *   - createDocument throws (errorCode: "server")
 *   - header extraction (x-forwarded-for present / absent, user-agent
 *     present / absent)
 */

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

vi.mock("@/features/studies/document/services/render-pdf", () => ({
  renderStudyToPdf: vi.fn(),
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
import { renderStudyToPdf } from "@/features/studies/document/services/render-pdf";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { findCustomerById } from "@/lib/repositories/customer.repository";
import { createDocument } from "@/lib/repositories/generated-document.repository";
import { findStudyById, markStudyGenerated } from "@/lib/repositories/study.repository";
import { findUserById } from "@/lib/repositories/user.repository";

import { generateDocumentAction } from "./generate-document";

const mockedAuth = vi.mocked(auth) as unknown as ReturnType<typeof vi.fn<() => Promise<unknown>>>;
const mockedRenderStudyToPdf = vi.mocked(renderStudyToPdf);

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
  flurstueck: "123/4",
  anlageKwp: 100,
};

const FOREIGN_STUDY = { ...READY_STUDY, consultantId: "user-9" };

const DRAFT_STUDY = { ...READY_STUDY, status: "DRAFT" as const };

const CUSTOMER = {
  id: "cust-1",
  contactFirstName: "Max",
  contactLastName: "Mustermann",
};

const CONSULTANT = {
  id: "user-1",
  email: "berater@example.com",
  firstName: "Berta",
  lastName: "Berater",
};

const RENDER_OK = {
  filename: "study-study-1-1717000000000.pdf",
  absolutePath: "/app/generated/study-1/study-study-1-1717000000000.pdf",
};

describe("generateDocumentAction (rewired to Playwright)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersStore.clear();
    headersStore.set("user-agent", "vitest");
    headersStore.set("x-forwarded-for", "10.0.0.1, 192.168.1.1");
    mockedAuth.mockResolvedValue(SESSION_BERATER);
    vi.mocked(findStudyById).mockResolvedValue(READY_STUDY as never);
    vi.mocked(findCustomerById).mockResolvedValue(CUSTOMER as never);
    vi.mocked(findUserById).mockResolvedValue(CONSULTANT as never);
    mockedRenderStudyToPdf.mockResolvedValue(RENDER_OK);
    vi.mocked(createDocument).mockResolvedValue({ id: "doc-pdf-1" } as never);
    vi.mocked(markStudyGenerated).mockResolvedValue(undefined as never);
  });

  it("returns validation when input is malformed", async () => {
    const result = await generateDocumentAction({ studyId: "" });
    expect(result).toEqual({ ok: false, errorCode: "validation" });
    expect(mockedRenderStudyToPdf).not.toHaveBeenCalled();
  });

  it("returns forbidden when no session", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result).toEqual({ ok: false, errorCode: "forbidden" });
  });

  it("returns not-found when study is missing", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce(null);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result).toEqual({ ok: false, errorCode: "not-found" });
  });

  it("returns forbidden when BERATER tries to generate a foreign study", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce(FOREIGN_STUDY as never);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result).toEqual({ ok: false, errorCode: "forbidden" });
  });

  it("returns incomplete when study is still DRAFT", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce(DRAFT_STUDY as never);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result).toEqual({ ok: false, errorCode: "incomplete" });
    expect(mockedRenderStudyToPdf).not.toHaveBeenCalled();
  });

  it("returns not-found when customer is gone", async () => {
    vi.mocked(findCustomerById).mockResolvedValueOnce(null);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result).toEqual({ ok: false, errorCode: "not-found" });
    expect(mockedRenderStudyToPdf).not.toHaveBeenCalled();
  });

  it("returns not-found when consultant is gone", async () => {
    vi.mocked(findUserById).mockResolvedValueOnce(null);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result).toEqual({ ok: false, errorCode: "not-found" });
    expect(mockedRenderStudyToPdf).not.toHaveBeenCalled();
  });

  it("returns render error when renderStudyToPdf throws", async () => {
    const err = new Error("Chromium crashed");
    mockedRenderStudyToPdf.mockRejectedValueOnce(err);
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result).toEqual({
      ok: false,
      errorCode: "render",
      message: "Chromium crashed",
    });
    expect(createDocument).not.toHaveBeenCalled();
  });

  it("returns render error with fallback message on non-Error throws", async () => {
    mockedRenderStudyToPdf.mockRejectedValueOnce("string-rejection");
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result).toEqual({
      ok: false,
      errorCode: "render",
      message: "Unbekannter Render-Fehler",
    });
  });

  it("happy path: BERATER generates PDF, persists doc + audit + revalidate", async () => {
    const result = await generateDocumentAction({ studyId: "study-1" });

    expect(result).toEqual({ ok: true, studyId: "study-1", pdfDocumentId: "doc-pdf-1" });
    expect(mockedRenderStudyToPdf).toHaveBeenCalledWith("study-1");

    expect(createDocument).toHaveBeenCalledTimes(1);
    const [studyArg, docArg] = vi.mocked(createDocument).mock.calls[0];
    expect(studyArg).toBe("study-1");
    expect(docArg.format).toBe("PDF");
    expect(docArg.filename).toBe(RENDER_OK.absolutePath);

    expect(markStudyGenerated).toHaveBeenCalledWith("greenscout", "study-1");

    expect(createAuditEntry).toHaveBeenCalledTimes(1);
    const [orgArg, auditArg] = vi.mocked(createAuditEntry).mock.calls[0];
    expect(orgArg).toBe("greenscout");
    expect(auditArg.action).toBe("GENERATE_DOCUMENT");
    expect(auditArg.changeSet).toEqual({
      pdfDocumentId: [null, "doc-pdf-1"],
      pdfPath: [null, RENDER_OK.absolutePath],
      pdfFilename: [null, RENDER_OK.filename],
    });
    expect(auditArg.ipAddress).toBe("10.0.0.1");
    expect(auditArg.userAgent).toBe("vitest");
  });

  it("happy path: ADMIN god-mode generates PDF for any consultant's study", async () => {
    mockedAuth.mockResolvedValueOnce(SESSION_ADMIN);
    vi.mocked(findStudyById).mockResolvedValueOnce(FOREIGN_STUDY as never);

    const result = await generateDocumentAction({ studyId: "study-1" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pdfDocumentId).toBe("doc-pdf-1");
    }
  });

  it("returns server when createDocument throws", async () => {
    vi.mocked(createDocument).mockRejectedValueOnce(new Error("DB down"));
    const result = await generateDocumentAction({ studyId: "study-1" });
    expect(result).toEqual({ ok: false, errorCode: "server" });
  });

  it("handles missing x-forwarded-for / user-agent gracefully (null in audit entry)", async () => {
    headersStore.clear();
    await generateDocumentAction({ studyId: "study-1" });

    const [, auditArg] = vi.mocked(createAuditEntry).mock.calls[0];
    expect(auditArg.ipAddress).toBeNull();
    expect(auditArg.userAgent).toBeNull();
  });
});
