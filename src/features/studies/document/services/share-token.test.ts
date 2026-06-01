/**
 * §7.10-Pivot PR 4 — Share-Token-Roundtrip + Trust-Boundary-Tests.
 *
 * Trust-Boundary: jedes „token verifiziert" entscheidet, ob ein
 * potenziell beliebiger HTTP-Request Kundendaten aus der DB ausliefert.
 * Daher ist 100% Coverage hier Pflicht (siehe `vitest.config.ts`).
 *
 * Abgedeckte Pfade:
 *   1. Roundtrip create → verify → ok mit identischem Payload.
 *   2. Tampered Payload (Bit-Flip nach Encoding) → invalid.
 *   3. Tampered Signature → invalid.
 *   4. Expired (`exp` in der Vergangenheit) → expired.
 *   5. Malformed: leerer String, kein Dot, drei Dots, leeres Segment,
 *      kaputtes Base64, kaputter JSON, fehlende Felder, falsche Typen.
 *   6. Missing HMAC-Secret (env-var unset / leer) → throw.
 *   7. Timing-Safe-Equal-Pfad explizit über `crypto.timingSafeEqual`
 *      verifiziert (verschiedene Längen → false, gleiche Bytes → true).
 *   8. `expiryFromDays` Helper-Berechnung.
 */

import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createShareToken,
  DEFAULT_SHARE_TOKEN_TTL_DAYS,
  expiryFromDays,
  verifyShareToken,
  type ShareTokenPayload,
} from "./share-token";

const SECRET = "test-share-hmac-secret-of-at-least-32-bytes!!";

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function payloadFromNow(overrides: Partial<ShareTokenPayload> = {}): ShareTokenPayload {
  return {
    studyId: "stu_abc123",
    exp: nowSeconds() + 3600,
    organizationId: "greenscout",
    ...overrides,
  };
}

describe("share-token", () => {
  beforeEach(() => {
    process.env.STUDY_SHARE_HMAC_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.STUDY_SHARE_HMAC_SECRET;
    vi.restoreAllMocks();
  });

  describe("createShareToken + verifyShareToken roundtrip", () => {
    it("returns { ok: true, payload } with identical fields after roundtrip", () => {
      const payload = payloadFromNow();
      const token = createShareToken(payload);

      const result = verifyShareToken(token);
      expect(result.ok).toBe(true);
      if (!result.ok) return; // type narrowing
      expect(result.payload).toEqual(payload);
    });

    it("token has exactly two base64url segments separated by a dot", () => {
      const token = createShareToken(payloadFromNow());

      const segments = token.split(".");
      expect(segments).toHaveLength(2);
      // base64url: no `+`, `/`, `=` characters.
      expect(segments[0]).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(segments[1]).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("two consecutive create calls with the same payload yield the same token (deterministic)", () => {
      const payload = payloadFromNow();
      expect(createShareToken(payload)).toBe(createShareToken(payload));
    });
  });

  describe("tampered tokens", () => {
    it("returns { reason: 'invalid' } when the payload segment is altered", () => {
      const token = createShareToken(payloadFromNow());
      const [payloadSeg, signatureSeg] = token.split(".");

      // Flip the first character of the payload to a different valid base64url
      // character to force the signature to mismatch.
      const tamperedPayload = (payloadSeg!.startsWith("A") ? "B" : "A") + payloadSeg!.slice(1);
      const tamperedToken = `${tamperedPayload}.${signatureSeg}`;

      const result = verifyShareToken(tamperedToken);
      expect(result).toEqual({ ok: false, reason: "invalid" });
    });

    it("returns { reason: 'invalid' } when the signature segment is altered", () => {
      const token = createShareToken(payloadFromNow());
      const [payloadSeg, signatureSeg] = token.split(".");

      const tamperedSignature =
        (signatureSeg!.startsWith("A") ? "B" : "A") + signatureSeg!.slice(1);
      const tamperedToken = `${payloadSeg}.${tamperedSignature}`;

      const result = verifyShareToken(tamperedToken);
      expect(result).toEqual({ ok: false, reason: "invalid" });
    });

    it("returns { reason: 'invalid' } when a different secret was used to sign", () => {
      // Sign with another secret, then verify with our test secret.
      process.env.STUDY_SHARE_HMAC_SECRET = "the-other-secret-also-32-bytes-or-more-bytes";
      const tokenSignedWithOther = createShareToken(payloadFromNow());

      process.env.STUDY_SHARE_HMAC_SECRET = SECRET;
      const result = verifyShareToken(tokenSignedWithOther);
      expect(result).toEqual({ ok: false, reason: "invalid" });
    });
  });

  describe("expired tokens", () => {
    it("returns { reason: 'expired' } when exp <= now", () => {
      const expired = payloadFromNow({ exp: nowSeconds() - 1 });
      const token = createShareToken(expired);
      expect(verifyShareToken(token)).toEqual({ ok: false, reason: "expired" });
    });

    it("returns { reason: 'expired' } when exp === now (boundary — not valid)", () => {
      // The contract: `exp <= now` is expired. Token MUST expire at exactly its
      // exp second, not one second later.
      const exactlyNow = nowSeconds();
      vi.useFakeTimers();
      vi.setSystemTime(exactlyNow * 1000);
      try {
        const token = createShareToken(payloadFromNow({ exp: exactlyNow }));
        expect(verifyShareToken(token)).toEqual({ ok: false, reason: "expired" });
      } finally {
        vi.useRealTimers();
      }
    });

    it("returns { ok: true } when exp is exactly one second in the future", () => {
      const fixedNow = 1_700_000_000;
      vi.useFakeTimers();
      vi.setSystemTime(fixedNow * 1000);
      try {
        const token = createShareToken(payloadFromNow({ exp: fixedNow + 1 }));
        const result = verifyShareToken(token);
        expect(result.ok).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("malformed tokens", () => {
    const malformedCases: Array<{ name: string; token: string }> = [
      { name: "empty string", token: "" },
      { name: "missing dot separator", token: "justonesegment" },
      { name: "two dots (three segments)", token: "a.b.c" },
      { name: "leading dot (empty first segment)", token: ".signaturesegment" },
      { name: "trailing dot (empty second segment)", token: "payloadsegment." },
      { name: "only a dot", token: "." },
    ];

    for (const { name, token } of malformedCases) {
      it(`returns { reason: 'malformed' } for ${name}`, () => {
        expect(verifyShareToken(token)).toEqual({ ok: false, reason: "malformed" });
      });
    }

    it("returns { reason: 'malformed' } when the payload base64 decodes to invalid JSON", () => {
      // Build a token whose payload is valid base64url but not valid JSON, then
      // re-sign so the signature passes — that forces the JSON.parse catch
      // branch in verifyShareToken to fire.
      const garbagePayload = Buffer.from("not json {", "utf8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const signature = crypto
        .createHmac("sha256", SECRET)
        .update(garbagePayload)
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const token = `${garbagePayload}.${signature}`;

      expect(verifyShareToken(token)).toEqual({ ok: false, reason: "malformed" });
    });

    it("returns { reason: 'malformed' } when payload JSON is missing required fields", () => {
      const partialJson = JSON.stringify({ studyId: "stu_x" }); // exp + organizationId missing
      const payloadSeg = Buffer.from(partialJson, "utf8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const signature = crypto
        .createHmac("sha256", SECRET)
        .update(payloadSeg)
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const token = `${payloadSeg}.${signature}`;

      expect(verifyShareToken(token)).toEqual({ ok: false, reason: "malformed" });
    });

    it("returns { reason: 'malformed' } when payload JSON has wrong field types", () => {
      // exp is a string, not a number.
      const wrongTypeJson = JSON.stringify({
        studyId: "stu_x",
        exp: "soon",
        organizationId: "greenscout",
      });
      const payloadSeg = Buffer.from(wrongTypeJson, "utf8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const signature = crypto
        .createHmac("sha256", SECRET)
        .update(payloadSeg)
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const token = `${payloadSeg}.${signature}`;

      expect(verifyShareToken(token)).toEqual({ ok: false, reason: "malformed" });
    });

    it("returns { reason: 'malformed' } when payload JSON is null", () => {
      const nullJson = "null";
      const payloadSeg = Buffer.from(nullJson, "utf8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const signature = crypto
        .createHmac("sha256", SECRET)
        .update(payloadSeg)
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const token = `${payloadSeg}.${signature}`;

      expect(verifyShareToken(token)).toEqual({ ok: false, reason: "malformed" });
    });

    it("returns { reason: 'malformed' } when token argument is not a string", () => {
      // TypeScript prevents this at compile time, but runtime callers in the
      // public route layer might still feed in undefined / number. Belt-and-
      // suspenders.
      expect(verifyShareToken(undefined as unknown as string)).toEqual({
        ok: false,
        reason: "malformed",
      });
      expect(verifyShareToken(123 as unknown as string)).toEqual({
        ok: false,
        reason: "malformed",
      });
    });
  });

  describe("STUDY_SHARE_HMAC_SECRET handling", () => {
    it("createShareToken throws a clear error when the env var is unset", () => {
      delete process.env.STUDY_SHARE_HMAC_SECRET;
      expect(() => createShareToken(payloadFromNow())).toThrowError(/STUDY_SHARE_HMAC_SECRET/);
    });

    it("createShareToken throws a clear error when the env var is empty string", () => {
      process.env.STUDY_SHARE_HMAC_SECRET = "";
      expect(() => createShareToken(payloadFromNow())).toThrowError(/STUDY_SHARE_HMAC_SECRET/);
    });

    it("verifyShareToken throws a clear error when the env var is unset", () => {
      const token = createShareToken(payloadFromNow());
      delete process.env.STUDY_SHARE_HMAC_SECRET;
      expect(() => verifyShareToken(token)).toThrowError(/STUDY_SHARE_HMAC_SECRET/);
    });
  });

  describe("constant-time signature comparison", () => {
    it("calls crypto.timingSafeEqual on the verify path (defense against timing leaks)", () => {
      const spy = vi.spyOn(crypto, "timingSafeEqual");
      const token = createShareToken(payloadFromNow());

      const result = verifyShareToken(token);
      expect(result.ok).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);

      // Sanity: arguments are equal-length Buffers (HMAC-SHA256 = 32 bytes).
      const args = spy.mock.calls[0]!;
      expect(args[0]).toBeInstanceOf(Buffer);
      expect(args[1]).toBeInstanceOf(Buffer);
      expect((args[0] as Buffer).length).toBe(32);
      expect((args[1] as Buffer).length).toBe(32);
    });

    it("short-circuits without calling timingSafeEqual when signature lengths differ", () => {
      const token = createShareToken(payloadFromNow());
      const [payloadSeg] = token.split(".");
      // Build a signature segment that decodes to fewer than 32 bytes.
      const shortSignature = "AAAA"; // base64url for 3 bytes
      const shortToken = `${payloadSeg}.${shortSignature}`;
      const spy = vi.spyOn(crypto, "timingSafeEqual");

      const result = verifyShareToken(shortToken);
      expect(result).toEqual({ ok: false, reason: "invalid" });
      // The unequal-length guard must NOT call timingSafeEqual (which would
      // throw on length mismatch).
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("expiryFromDays helper", () => {
    it("computes exp from a fixed nowMs + N days", () => {
      const fixedNowMs = 1_700_000_000 * 1000; // a Wednesday in 2023
      const exp = expiryFromDays(30, fixedNowMs);
      expect(exp).toBe(1_700_000_000 + 30 * 86400);
    });

    it("uses Date.now() when nowMs is omitted", () => {
      const before = Math.floor(Date.now() / 1000);
      const exp = expiryFromDays(1);
      const after = Math.floor(Date.now() / 1000);
      // exp should be within a 2-second window around now + 1 day
      expect(exp).toBeGreaterThanOrEqual(before + 86400);
      expect(exp).toBeLessThanOrEqual(after + 86400 + 1);
    });

    it("exports DEFAULT_SHARE_TOKEN_TTL_DAYS = 30", () => {
      expect(DEFAULT_SHARE_TOKEN_TTL_DAYS).toBe(30);
    });
  });
});
