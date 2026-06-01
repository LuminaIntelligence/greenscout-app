/**
 * §7.10-Pivot PR 4 — HMAC-gated Share-Token für die Kunden-Online-Ansicht.
 *
 * Sharebare Online-Vorschau der Machbarkeitsstudie ohne Kunden-Login:
 * der Berater erzeugt einen signierten Token, sendet ihm den daraus
 * gebauten Link, der Kunde öffnet die Studie unter
 * `${APP_URL}/studie/[studyId]?t=<token>`. Server validiert serverseitig.
 *
 * Token-Format (kompakte 2-segmentige Variante):
 *
 *   <base64url(JSON-payload)>.<base64url(HMAC-SHA256-signature)>
 *
 * Wir bauen **kein JWT** — JWT bietet hier keinen Mehrwert (kein
 * Federation, kein OAuth-Flow, keine Standard-Claim-Library-Konsumenten)
 * und würde Abhängigkeits-Overhead und eine zusätzliche zu-tightening-
 * geneigte CVE-Oberfläche bringen. Das hand-rollende HMAC-Pattern ist
 * Standard-Industrie für intra-app signed URLs (vgl. AWS S3 pre-signed,
 * Slack OAuth state, Stripe webhook signatures).
 *
 * Signatur-Verifikation via `crypto.timingSafeEqual` (constant-time
 * compare) gegen Timing-Side-Channels.
 *
 * **Verbindlich für Produktion:** `STUDY_SHARE_HMAC_SECRET` muss in der
 * ENV gesetzt sein (mindestens 32 Bytes Rohentropie — siehe
 * `.env.production.example`). Beim Fehlen wirft sowohl `createShareToken`
 * als auch `verifyShareToken` synchron, damit die Pipeline lautstark
 * scheitert statt stillschweigend unsignierte Tokens auszustellen.
 *
 * @see SPEC.md §4.8 (Online-Ansicht für Kunden)
 * @see DECISIONS.md 2026-06-01 — §7.10-Pivot PR 4
 */

import crypto from "node:crypto";

export interface ShareTokenPayload {
  studyId: string;
  /** Unix epoch seconds (NOT milliseconds — JSON-economically + matches JWT-`exp`-Konvention). */
  exp: number;
  organizationId: string;
}

export type ShareTokenVerifyResult =
  | { ok: true; payload: ShareTokenPayload }
  | { ok: false; reason: "invalid" | "expired" | "malformed" };

/**
 * Default-Expiry-Window für share-Tokens, wenn der Caller keinen
 * Override mitgibt. 30 Tage entspricht der Frist, in der ein Kunde
 * typischerweise auf die Studie reagiert (Termin-Vorschläge sind in
 * Slide 19 hinterlegt; ein Default knapp drüber gibt Berater + Kunde
 * ausreichenden Puffer für die übliche Hin- und Her-Korrespondenz).
 *
 * Wenn der User ein längeres/kürzeres Default haben will, ist das eine
 * Folge-Iteration — der Server-Action-Param `expiresInDays` macht die
 * Anpassung pro Link bereits jetzt möglich.
 */
export const DEFAULT_SHARE_TOKEN_TTL_DAYS = 30;

const ENV_NAME = "STUDY_SHARE_HMAC_SECRET";

function readSecret(): string {
  const secret = process.env[ENV_NAME];
  if (!secret || secret.length === 0) {
    throw new Error(
      `[share-token] ${ENV_NAME} ist nicht gesetzt. ` +
        "Bitte eine zufällige Hex-/Base64-Zeichenkette mit mind. 32 Bytes Entropie " +
        "in der Umgebung hinterlegen (siehe .env.production.example).",
    );
  }
  return secret;
}

/**
 * Base64URL-Encoding (RFC 4648 §5) — URL-safe ohne `+`, `/`, `=`.
 *
 * Node's `Buffer.toString("base64url")` ist seit Node 16 stabil, aber wir
 * encoden defensiv selbst, damit der Helper auch in einem Vitest-
 * jsdom-Worker ohne Buffer-Polyfill durchläuft.
 */
function base64urlEncode(data: Buffer): string {
  return data.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(input: string): Buffer {
  // Restore standard base64 + padding so `Buffer.from(..., "base64")` accepts it.
  const padded = input
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64");
}

function computeSignature(payloadSegment: string): Buffer {
  const secret = readSecret();
  return crypto.createHmac("sha256", secret).update(payloadSegment).digest();
}

/**
 * Erzeugt einen signierten Share-Token aus dem gegebenen Payload.
 *
 * Der Caller (`create-share-link` Server Action) füllt:
 *   - `studyId` und `organizationId` aus dem Session-Kontext
 *   - `exp` aus `now + expiresInDays * 86400`
 *
 * Wirft, wenn `STUDY_SHARE_HMAC_SECRET` nicht konfiguriert ist.
 */
export function createShareToken(payload: ShareTokenPayload): string {
  const payloadJson = JSON.stringify(payload);
  const payloadSegment = base64urlEncode(Buffer.from(payloadJson, "utf8"));
  const signature = computeSignature(payloadSegment);
  const signatureSegment = base64urlEncode(signature);
  return `${payloadSegment}.${signatureSegment}`;
}

/**
 * Konstant-Zeit-Vergleich zweier `Buffer` gleicher Länge.
 *
 * `crypto.timingSafeEqual` wirft, wenn die Längen nicht übereinstimmen
 * — daher checken wir das vorher und werten ungleiche Längen als
 * Mismatch (nicht als Fehler) auf den Caller-Pfad.
 */
function constantTimeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Verifiziert einen Share-Token.
 *
 * Reihenfolge:
 *   1. Struktur-Check (genau ein `.`-Separator, beide Segmente nicht leer).
 *   2. Signatur-Check (constant-time HMAC-SHA256 Vergleich).
 *   3. Payload-Parse (JSON-Shape + Felder).
 *   4. Expiry-Check (`exp <= now` → expired).
 *
 * Niemand außer dem Owner-Process kann valide Signaturen erzeugen, weil
 * `STUDY_SHARE_HMAC_SECRET` nur server-seitig vorhanden ist. Tampern
 * am Payload bricht die Signatur → `invalid`. Manuell expired Token →
 * `expired`. Müll → `malformed`.
 */
export function verifyShareToken(token: string): ShareTokenVerifyResult {
  if (typeof token !== "string" || token.length === 0) {
    return { ok: false, reason: "malformed" };
  }
  const segments = token.split(".");
  if (segments.length !== 2) {
    return { ok: false, reason: "malformed" };
  }
  const [payloadSegment, signatureSegment] = segments;
  if (!payloadSegment || !signatureSegment) {
    return { ok: false, reason: "malformed" };
  }

  const presentedSignature = base64urlDecode(signatureSegment);
  const expectedSignature = computeSignature(payloadSegment);
  if (!constantTimeEqual(presentedSignature, expectedSignature)) {
    return { ok: false, reason: "invalid" };
  }

  let payload: ShareTokenPayload;
  try {
    const json = base64urlDecode(payloadSegment).toString("utf8");
    const parsed = JSON.parse(json) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as ShareTokenPayload).studyId !== "string" ||
      typeof (parsed as ShareTokenPayload).exp !== "number" ||
      typeof (parsed as ShareTokenPayload).organizationId !== "string"
    ) {
      return { ok: false, reason: "malformed" };
    }
    payload = parsed as ShareTokenPayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp <= nowSeconds) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, payload };
}

/**
 * Helper für Caller, die `exp` aus „in N Tagen" berechnen wollen.
 * Default-TTL ist `DEFAULT_SHARE_TOKEN_TTL_DAYS`. Tests können `nowMs`
 * für deterministische Berechnungen mitgeben.
 */
export function expiryFromDays(days: number, nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1000) + days * 24 * 60 * 60;
}
