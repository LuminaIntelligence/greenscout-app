/**
 * §7.10-Pivot PR 4 — Trust-Boundary-Tests für `createShareLinkAction`.
 *
 * Pfade:
 *   - Validation: Schema rejects (leerer studyId, ttl < 1 / > 365).
 *   - No session → forbidden.
 *   - Study not found → not-found.
 *   - Foreign-BERATER auf fremde Studie → forbidden (canAccessStudy).
 *   - Owner / ADMIN happy path → ok mit korrekter URL + Default-TTL.
 *   - Custom TTL → ok mit korrektem expiresAt.
 *   - createShareToken wirft (missing APP_URL oder missing secret) → server.
 *   - createAuditEntry wirft → server.
 *   - Audit-changeSet enthält `tokenExpiresAt` + `ttlDays`, NICHT den Token selbst.
 *   - Headers fehlen → ipAddress / userAgent = null.
 *   - Headers vorhanden → erste IP aus x-forwarded-for + userAgent.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/repositories/study.repository", () => ({
  findStudyById: vi.fn(),
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

// Wir mocken den Token-Service NICHT — wir wollen den realen HMAC-Pfad
// inkl. constant-time-compare bis ans Ende laufen lassen. APP_URL +
// STUDY_SHARE_HMAC_SECRET werden in beforeEach gesetzt.

import { auth } from "@/lib/auth";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { findStudyById } from "@/lib/repositories/study.repository";
import {
  verifyShareToken,
  type ShareTokenPayload,
} from "@/features/studies/document/services/share-token";

import { createShareLinkAction } from "./create-share-link";

const mockedAuth = vi.mocked(auth) as unknown as ReturnType<typeof vi.fn<() => Promise<unknown>>>;

const OWNER_SESSION = {
  user: {
    id: "user-owner",
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
  user: { ...OWNER_SESSION.user, id: "user-admin", role: "ADMIN" as const },
};

const FOREIGN_SESSION = {
  ...OWNER_SESSION,
  user: { ...OWNER_SESSION.user, id: "user-foreign" },
};

const STUDY = {
  id: "stu_abc",
  consultantId: "user-owner",
  organizationId: "greenscout",
};

beforeEach(() => {
  vi.clearAllMocks();
  headersStore.clear();
  process.env.STUDY_SHARE_HMAC_SECRET = "test-secret-of-at-least-32-bytes-or-more-here";
  process.env.APP_URL = "https://greenscout.example.com";
  mockedAuth.mockResolvedValue(OWNER_SESSION);
  vi.mocked(findStudyById).mockResolvedValue(STUDY as never);
});

afterEach(() => {
  delete process.env.STUDY_SHARE_HMAC_SECRET;
  delete process.env.APP_URL;
});

describe("createShareLinkAction — validation", () => {
  it("returns validation when studyId is empty", async () => {
    const result = await createShareLinkAction({ studyId: "" });
    expect(result).toEqual({ ok: false, errorCode: "validation" });
  });

  it("returns validation when input shape is wrong", async () => {
    const result = await createShareLinkAction({ notAStudyId: "x" });
    expect(result).toEqual({ ok: false, errorCode: "validation" });
  });

  it("returns validation when expiresInDays is 0", async () => {
    const result = await createShareLinkAction({ studyId: "stu_abc", expiresInDays: 0 });
    expect(result).toEqual({ ok: false, errorCode: "validation" });
  });

  it("returns validation when expiresInDays is > 365", async () => {
    const result = await createShareLinkAction({ studyId: "stu_abc", expiresInDays: 366 });
    expect(result).toEqual({ ok: false, errorCode: "validation" });
  });

  it("returns validation when expiresInDays is not integer", async () => {
    const result = await createShareLinkAction({ studyId: "stu_abc", expiresInDays: 1.5 });
    expect(result).toEqual({ ok: false, errorCode: "validation" });
  });
});

describe("createShareLinkAction — auth + access", () => {
  it("returns forbidden when there is no session", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await createShareLinkAction({ studyId: "stu_abc" });
    expect(result).toEqual({ ok: false, errorCode: "forbidden" });
  });

  it("returns not-found when the study does not exist", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce(null);
    const result = await createShareLinkAction({ studyId: "stu_missing" });
    expect(result).toEqual({ ok: false, errorCode: "not-found" });
    expect(findStudyById).toHaveBeenCalledWith("greenscout", "stu_missing");
  });

  it("returns forbidden when a foreign BERATER tries to share another consultant's study", async () => {
    mockedAuth.mockResolvedValueOnce(FOREIGN_SESSION);
    const result = await createShareLinkAction({ studyId: "stu_abc" });
    expect(result).toEqual({ ok: false, errorCode: "forbidden" });
    expect(createAuditEntry).not.toHaveBeenCalled();
  });

  it("allows ADMIN god-mode share for a foreign study", async () => {
    mockedAuth.mockResolvedValueOnce(ADMIN_SESSION);
    const result = await createShareLinkAction({ studyId: "stu_abc" });
    expect(result.ok).toBe(true);
  });
});

describe("createShareLinkAction — happy path", () => {
  it("builds a URL with APP_URL + path-encoded study id + token query param", async () => {
    const result = await createShareLinkAction({ studyId: "stu_abc" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.studyId).toBe("stu_abc");
    expect(result.url).toMatch(
      /^https:\/\/greenscout\.example\.com\/studie\/stu_abc\?t=[A-Za-z0-9_\-.]+$/,
    );
  });

  it("trims trailing slashes from APP_URL so the URL stays clean", async () => {
    process.env.APP_URL = "https://greenscout.example.com////";
    const result = await createShareLinkAction({ studyId: "stu_abc" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.url.startsWith("https://greenscout.example.com/studie/")).toBe(true);
  });

  it("returns a token that verifies back to the same studyId + organizationId + exp", async () => {
    const result = await createShareLinkAction({ studyId: "stu_abc" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const token = new URL(result.url).searchParams.get("t");
    expect(token).toBeTruthy();
    const verified = verifyShareToken(token!);
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    const payload: ShareTokenPayload = verified.payload;
    expect(payload.studyId).toBe("stu_abc");
    expect(payload.organizationId).toBe("greenscout");

    // expiresAt aus dem Action-Output muss konsistent zum Token-`exp` sein.
    const fromAction = Math.floor(new Date(result.expiresAt).getTime() / 1000);
    expect(payload.exp).toBe(fromAction);
  });

  it("defaults to ~30 days expiry", async () => {
    const before = Date.now();
    const result = await createShareLinkAction({ studyId: "stu_abc" });
    const after = Date.now();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const expSeconds = Math.floor(new Date(result.expiresAt).getTime() / 1000);
    const lowerBound = Math.floor(before / 1000) + 30 * 86400;
    const upperBound = Math.floor(after / 1000) + 30 * 86400;
    expect(expSeconds).toBeGreaterThanOrEqual(lowerBound);
    expect(expSeconds).toBeLessThanOrEqual(upperBound + 1);
  });

  it("honors a custom expiresInDays value", async () => {
    const before = Date.now();
    const result = await createShareLinkAction({ studyId: "stu_abc", expiresInDays: 7 });
    const after = Date.now();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const expSeconds = Math.floor(new Date(result.expiresAt).getTime() / 1000);
    expect(expSeconds).toBeGreaterThanOrEqual(Math.floor(before / 1000) + 7 * 86400);
    expect(expSeconds).toBeLessThanOrEqual(Math.floor(after / 1000) + 7 * 86400 + 1);
  });

  it("path-encodes the studyId in the URL so unusual ids don't break the link", async () => {
    vi.mocked(findStudyById).mockResolvedValueOnce({
      ...STUDY,
      id: "stu / oddly named",
    } as never);
    const result = await createShareLinkAction({ studyId: "stu / oddly named" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.url).toContain("/studie/stu%20%2F%20oddly%20named?t=");
  });
});

describe("createShareLinkAction — audit log", () => {
  it("writes a SHARE_LINK_CREATED audit entry with tokenExpiresAt + ttlDays — NOT the token itself", async () => {
    headersStore.set("x-forwarded-for", "203.0.113.7, 10.0.0.1");
    headersStore.set("user-agent", "Mozilla/5.0 (test runner)");
    const result = await createShareLinkAction({ studyId: "stu_abc", expiresInDays: 14 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(createAuditEntry).toHaveBeenCalledTimes(1);
    const [orgIdArg, payloadArg] = vi.mocked(createAuditEntry).mock.calls[0]!;
    expect(orgIdArg).toBe("greenscout");
    expect(payloadArg).toMatchObject({
      user: { connect: { id: "user-owner" } },
      entityType: "Study",
      entityId: "stu_abc",
      action: "SHARE_LINK_CREATED",
      ipAddress: "203.0.113.7",
      userAgent: "Mozilla/5.0 (test runner)",
    });
    const changeSet = (payloadArg as { changeSet: Record<string, unknown> }).changeSet;
    expect(changeSet).toMatchObject({
      tokenExpiresAt: [null, result.expiresAt],
      ttlDays: [null, 14],
    });
    // No token leak in the audit row.
    expect(JSON.stringify(changeSet)).not.toContain(
      new URL(result.url).searchParams.get("t")!.slice(0, 24),
    );
  });

  it("uses null for ipAddress + userAgent when headers are absent", async () => {
    const result = await createShareLinkAction({ studyId: "stu_abc" });
    expect(result.ok).toBe(true);
    const [, payloadArg] = vi.mocked(createAuditEntry).mock.calls[0]!;
    expect(payloadArg).toMatchObject({
      ipAddress: null,
      userAgent: null,
    });
  });
});

describe("createShareLinkAction — error paths", () => {
  it("returns server when APP_URL is unset (token build fails)", async () => {
    delete process.env.APP_URL;
    const result = await createShareLinkAction({ studyId: "stu_abc" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe("server");
    expect(result.message).toMatch(/APP_URL/);
    expect(createAuditEntry).not.toHaveBeenCalled();
  });

  it("returns server when STUDY_SHARE_HMAC_SECRET is unset (token build fails)", async () => {
    delete process.env.STUDY_SHARE_HMAC_SECRET;
    const result = await createShareLinkAction({ studyId: "stu_abc" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe("server");
    expect(createAuditEntry).not.toHaveBeenCalled();
  });

  it("returns server when audit write fails (non-Error rejection)", async () => {
    vi.mocked(createAuditEntry).mockRejectedValueOnce(new Error("audit table missing"));
    const result = await createShareLinkAction({ studyId: "stu_abc" });
    expect(result).toEqual({ ok: false, errorCode: "server" });
  });

  it("returns server with generic message on non-Error throw from token build", async () => {
    // Force readAppUrl path with empty string (separate branch from `undefined`).
    process.env.APP_URL = "";
    const result = await createShareLinkAction({ studyId: "stu_abc" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe("server");
  });

  it("falls back to the generic message when readAppUrl throws a non-Error value", async () => {
    // Force the `err instanceof Error ? ... : "Unbekannter Token-Fehler"`
    // branch — readAppUrl normally throws an Error, but downstream callers
    // could in principle throw any value. We patch process.env via a Proxy
    // that throws a primitive string instead.
    const originalDescriptor = Object.getOwnPropertyDescriptor(process, "env")!;
    const fakeEnv = new Proxy(process.env, {
      get(target, prop) {
        if (prop === "APP_URL") {
          throw "primitive-string-not-an-Error";
        }
        return target[prop as string];
      },
    });
    Object.defineProperty(process, "env", { value: fakeEnv, configurable: true });
    try {
      const result = await createShareLinkAction({ studyId: "stu_abc" });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errorCode).toBe("server");
      expect(result.message).toBe("Unbekannter Token-Fehler");
    } finally {
      Object.defineProperty(process, "env", originalDescriptor);
    }
  });
});
