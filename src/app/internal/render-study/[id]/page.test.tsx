/**
 * §7.10-Pivot PR 3 — Token-Gate-Tests für die interne Playwright-Render-Route.
 *
 * Trust-Boundary: zwei Dimensionen werden hier abgedeckt:
 *   1. Token-Header MUSS gleich `process.env.INTERNAL_RENDER_TOKEN` sein —
 *      bei Mismatch, fehlendem Header, oder fehlender ENV-Variable rufen
 *      wir `notFound()` und liefern keine Studien-Daten aus.
 *   2. Wenn der Token passt, aber die Studie nicht existiert (oder
 *      `buildStudyDocumentData()` returns `null`), rufen wir ebenfalls
 *      `notFound()` — vermeidet Crash bei manuellem Token-Test gegen
 *      eine deleted study.
 *
 * Die eigentliche Renderlogik (StudyDocument-Komponente) ist ausgiebig in
 * PR 2 getestet (`slides.test.tsx`, `document.test.tsx`).
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const notFoundCalls: string[] = [];

vi.mock("next/navigation", () => ({
  notFound: () => {
    notFoundCalls.push("called");
    // notFound() throws in real Next.js — mimic that so the page handler
    // short-circuits before touching renderable data downstream.
    throw new Error("NEXT_NOT_FOUND");
  },
}));

let headerStore: Map<string, string> = new Map();
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve({ get: (k: string) => headerStore.get(k.toLowerCase()) ?? null }),
}));

const buildStudyDocumentDataMock = vi.fn();
vi.mock("@/features/studies/document/services/build-document-data", () => ({
  buildStudyDocumentData: (...args: unknown[]) => buildStudyDocumentDataMock(...args),
}));

vi.mock("@/features/studies/document/document", () => ({
  StudyDocument: ({ data }: { data: { study: { id: string } } }) =>
    // jsdom-friendly stub — we only care that the page handler reached the
    // happy path with the right data, not what the slides actually render.
    ({ type: "div", props: { "data-study-id": data.study.id } }) as unknown,
}));

vi.mock("@/features/studies/document/print.css", () => ({}));

import InternalRenderStudyPage from "./page";

const VALID_TOKEN = "test-internal-render-secret";

describe("InternalRenderStudyPage — token gate", () => {
  beforeEach(() => {
    notFoundCalls.length = 0;
    headerStore = new Map();
    buildStudyDocumentDataMock.mockReset();
    process.env.INTERNAL_RENDER_TOKEN = VALID_TOKEN;
  });

  afterEach(() => {
    delete process.env.INTERNAL_RENDER_TOKEN;
  });

  async function callPage(studyId = "stu_123") {
    return InternalRenderStudyPage({ params: Promise.resolve({ id: studyId }) });
  }

  it("calls notFound() when INTERNAL_RENDER_TOKEN env is missing", async () => {
    delete process.env.INTERNAL_RENDER_TOKEN;
    headerStore.set("x-internal-render-token", VALID_TOKEN);

    await expect(callPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundCalls).toHaveLength(1);
    expect(buildStudyDocumentDataMock).not.toHaveBeenCalled();
  });

  it("calls notFound() when INTERNAL_RENDER_TOKEN env is empty string", async () => {
    process.env.INTERNAL_RENDER_TOKEN = "";
    headerStore.set("x-internal-render-token", VALID_TOKEN);

    await expect(callPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundCalls).toHaveLength(1);
    expect(buildStudyDocumentDataMock).not.toHaveBeenCalled();
  });

  it("calls notFound() when the request header is missing", async () => {
    // no header set in headerStore
    await expect(callPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundCalls).toHaveLength(1);
    expect(buildStudyDocumentDataMock).not.toHaveBeenCalled();
  });

  it("calls notFound() when the request header value is wrong", async () => {
    headerStore.set("x-internal-render-token", "the-wrong-secret");

    await expect(callPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundCalls).toHaveLength(1);
    expect(buildStudyDocumentDataMock).not.toHaveBeenCalled();
  });

  it("calls notFound() when buildStudyDocumentData returns null (study missing)", async () => {
    headerStore.set("x-internal-render-token", VALID_TOKEN);
    buildStudyDocumentDataMock.mockResolvedValueOnce(null);

    await expect(callPage("stu_missing")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundCalls).toHaveLength(1);
    expect(buildStudyDocumentDataMock).toHaveBeenCalledWith("greenscout", "stu_missing");
  });

  it("renders the document when the token matches and the study is found", async () => {
    headerStore.set("x-internal-render-token", VALID_TOKEN);
    const data = {
      study: { id: "stu_ok" },
      customer: {},
      consultant: {},
      derivedValues: {},
      images: {},
    };
    buildStudyDocumentDataMock.mockResolvedValueOnce(data);

    const result = await callPage("stu_ok");

    expect(notFoundCalls).toHaveLength(0);
    expect(buildStudyDocumentDataMock).toHaveBeenCalledWith("greenscout", "stu_ok");
    expect(result).toBeDefined();
  });
});
