/**
 * §7.10-Pivot PR 4 — Trust-Boundary-Tests für `/studie/[id]?t=<token>`.
 *
 * Pfade:
 *   1. Kein Token im Query → notFound().
 *   2. Empty-String-Token → notFound().
 *   3. Token = Array (Next.js gibt searchParams als string | string[] heraus) → erste Component genommen.
 *   4. Token malformed / invalid signature → notFound().
 *   5. Token expired → eigene Error-Page mit „Sie"-Microcopy gerendert (kein notFound).
 *   6. Token-`studyId` ≠ Route-Param-`id` → notFound() (Anti-Token-Hopping).
 *   7. Token ok aber buildStudyDocumentData returns null → notFound().
 *   8. Happy path → `<StudyDocument data={...} />` Wrapper gerendert mit Banner.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const notFoundCalls: string[] = [];

vi.mock("next/navigation", () => ({
  notFound: () => {
    notFoundCalls.push("called");
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const verifyShareTokenMock = vi.fn();
vi.mock("@/features/studies/document/services/share-token", () => ({
  verifyShareToken: (...args: unknown[]) => verifyShareTokenMock(...args),
}));

const buildStudyDocumentDataMock = vi.fn();
vi.mock("@/features/studies/document/services/build-document-data", () => ({
  buildStudyDocumentData: (...args: unknown[]) => buildStudyDocumentDataMock(...args),
}));

vi.mock("@/features/studies/document/document", () => ({
  // Plain stub so the rendered tree carries a recognisable marker
  // ("STUDY_DOCUMENT_STUB:<studyId>") in JSON-stringified form.
  StudyDocument: ({ data }: { data: { study: { id: string } } }) =>
    `STUDY_DOCUMENT_STUB:${data.study.id}`,
}));

vi.mock("@/features/studies/document/print.css", () => ({}));

import PublicStudyPage from "./page";

const VALID_PAYLOAD = {
  studyId: "stu_abc",
  exp: 1_900_000_000,
  organizationId: "greenscout",
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
}

function callPage(opts: {
  studyId?: string;
  token?: string | string[] | undefined;
}): Promise<unknown> {
  const props: PageProps = {
    params: Promise.resolve({ id: opts.studyId ?? "stu_abc" }),
    searchParams: Promise.resolve({ t: opts.token }),
  };
  return PublicStudyPage(props);
}

describe("PublicStudyPage — token gate", () => {
  beforeEach(() => {
    notFoundCalls.length = 0;
    verifyShareTokenMock.mockReset();
    buildStudyDocumentDataMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls notFound() when no `t` query param is present", async () => {
    await expect(callPage({ token: undefined })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundCalls).toHaveLength(1);
    expect(verifyShareTokenMock).not.toHaveBeenCalled();
  });

  it("calls notFound() when `t` is the empty string", async () => {
    await expect(callPage({ token: "" })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundCalls).toHaveLength(1);
    expect(verifyShareTokenMock).not.toHaveBeenCalled();
  });

  it("takes the first array entry when Next gives `t` as string[]", async () => {
    verifyShareTokenMock.mockReturnValueOnce({ ok: false, reason: "invalid" });
    await expect(callPage({ token: ["tok-one", "tok-two"] })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(verifyShareTokenMock).toHaveBeenCalledWith("tok-one");
  });

  it("calls notFound() when verifyShareToken returns invalid", async () => {
    verifyShareTokenMock.mockReturnValueOnce({ ok: false, reason: "invalid" });
    await expect(callPage({ token: "tampered" })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundCalls).toHaveLength(1);
    expect(buildStudyDocumentDataMock).not.toHaveBeenCalled();
  });

  it("calls notFound() when verifyShareToken returns malformed", async () => {
    verifyShareTokenMock.mockReturnValueOnce({ ok: false, reason: "malformed" });
    await expect(callPage({ token: "abc" })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundCalls).toHaveLength(1);
  });

  it("renders the expired error page (NOT notFound) when verifyShareToken returns expired", async () => {
    verifyShareTokenMock.mockReturnValueOnce({ ok: false, reason: "expired" });
    const result = await callPage({ token: "expired-token" });
    expect(notFoundCalls).toHaveLength(0);
    expect(buildStudyDocumentDataMock).not.toHaveBeenCalled();
    expect(result).toBeDefined();
    // The expired error page must use the „Sie"-Form expired copy.
    const html = JSON.stringify(result);
    expect(html).toContain("Link abgelaufen");
  });

  it("calls notFound() when token-payload.studyId does not match the route param", async () => {
    verifyShareTokenMock.mockReturnValueOnce({
      ok: true,
      payload: { ...VALID_PAYLOAD, studyId: "stu_OTHER" },
    });
    await expect(callPage({ studyId: "stu_abc", token: "tok" })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundCalls).toHaveLength(1);
    expect(buildStudyDocumentDataMock).not.toHaveBeenCalled();
  });

  it("calls notFound() when buildStudyDocumentData returns null (study missing)", async () => {
    verifyShareTokenMock.mockReturnValueOnce({ ok: true, payload: VALID_PAYLOAD });
    buildStudyDocumentDataMock.mockResolvedValueOnce(null);
    await expect(callPage({ studyId: "stu_abc", token: "tok" })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundCalls).toHaveLength(1);
    expect(buildStudyDocumentDataMock).toHaveBeenCalledWith("greenscout", "stu_abc");
  });

  it("renders the StudyDocument on the happy path with the validity banner", async () => {
    verifyShareTokenMock.mockReturnValueOnce({ ok: true, payload: VALID_PAYLOAD });
    buildStudyDocumentDataMock.mockResolvedValueOnce({
      study: { id: "stu_abc" },
      customer: {},
      consultant: {},
      derivedValues: {},
      images: {},
    });
    const result = await callPage({ studyId: "stu_abc", token: "good-token" });
    expect(notFoundCalls).toHaveLength(0);

    // The exact rendered tree contains:
    //  - the banner with "Diese Vorschau ist gültig bis <DD.MM.YYYY>."
    //  - the <StudyDocument /> stub
    const html = JSON.stringify(result);
    expect(html).toContain("gültig bis");
    // The StudyDocument mock is rendered as a child React element; its
    // `data.study.id` should reach it intact.
    expect(html).toContain('"id":"stu_abc"');
  });
});
