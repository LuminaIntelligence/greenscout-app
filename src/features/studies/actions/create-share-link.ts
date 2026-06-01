"use server";

/**
 * §7.10-Pivot PR 4 — create-share-link Server Action.
 *
 * Erzeugt für eine vom Berater (oder Admin) zugängliche Studie einen
 * signierten HMAC-Share-Link. Der Berater pastet diesen Link in die
 * Korrespondenz mit dem Kunden; der Kunde öffnet die Studie unter
 * `${APP_URL}/studie/[id]?t=<token>` ohne eigenes Konto.
 *
 * Trust boundary:
 *
 *   - re-fetch der Session (Berater oder Admin nur),
 *   - Ownership-Check via `canAccessStudy` (owner BERATER, oder ADMIN),
 *   - `createShareToken({ studyId, exp, organizationId })`,
 *   - `AuditLog`-Eintrag `SHARE_LINK_CREATED` (additiv zur SPEC §5.1
 *     allow-list) mit `tokenExpiresAt`-changeSet für DSGVO-Nachverfolgung,
 *   - URL `${APP_URL}/studie/<id>?t=<token>` returnen.
 *
 * **Kein Mutations-Effekt auf die Studie selbst** — der Token enthält
 * den Ablauf-Timestamp eingebaut; Revocation für MVP nur via
 * `STUDY_SHARE_HMAC_SECRET`-Rotation (invalidiert alle Tokens).
 *
 * @see SPEC.md §4.8 (Online-Ansicht für Kunden)
 * @see DECISIONS.md 2026-06-01 — §7.10-Pivot PR 4
 */

import { headers } from "next/headers";
import { z } from "zod";

import { canAccessStudy } from "@/features/auth/utils/can-access-study";
import {
  createShareToken,
  DEFAULT_SHARE_TOKEN_TTL_DAYS,
  expiryFromDays,
} from "@/features/studies/document/services/share-token";
import { auth } from "@/lib/auth";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { findStudyById } from "@/lib/repositories/study.repository";

export type CreateShareLinkResult =
  | {
      ok: true;
      studyId: string;
      url: string;
      expiresAt: string; // ISO 8601, for UI display
    }
  | {
      ok: false;
      errorCode: "validation" | "forbidden" | "not-found" | "server";
      message?: string;
    };

// 1–365 Tage — sinnvoll begrenzt, damit niemand einen 50-Jahre-Link aus
// Versehen erzeugt. Default in `share-token.ts`.
const inputSchema = z.object({
  studyId: z.string().min(1),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

function readAppUrl(): string {
  const raw = process.env.APP_URL;
  if (!raw || raw.length === 0) {
    // Wenn `APP_URL` fehlt, kann die Action keine sinnvolle URL bauen.
    // Wir wollen das laut versagen statt einen verkrüppelten Link
    // auszuliefern.
    throw new Error("[create-share-link] APP_URL ist nicht gesetzt.");
  }
  // Trim trailing slashes so URL.assembly bleibt sauber.
  return raw.replace(/\/+$/, "");
}

export async function createShareLinkAction(rawInput: unknown): Promise<CreateShareLinkResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, errorCode: "validation" };
  }

  const session = await auth();
  if (!session?.user) {
    return { ok: false, errorCode: "forbidden" };
  }

  const { studyId, expiresInDays } = parsed.data;
  const organizationId = session.user.organizationId;

  const study = await findStudyById(organizationId, studyId);
  if (study === null) {
    return { ok: false, errorCode: "not-found" };
  }
  if (!canAccessStudy(session, study)) {
    return { ok: false, errorCode: "forbidden" };
  }

  const ttlDays = expiresInDays ?? DEFAULT_SHARE_TOKEN_TTL_DAYS;
  const exp = expiryFromDays(ttlDays);
  const expiresAt = new Date(exp * 1000).toISOString();

  let token: string;
  let appUrl: string;
  try {
    appUrl = readAppUrl();
    token = createShareToken({
      studyId,
      exp,
      organizationId,
    });
  } catch (err) {
    console.error("[create-share-link] token build failed", err);
    return {
      ok: false,
      errorCode: "server",
      message: err instanceof Error ? err.message : "Unbekannter Token-Fehler",
    };
  }

  const url = `${appUrl}/studie/${encodeURIComponent(studyId)}?t=${token}`;

  const headerList = await headers();
  const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent") ?? null;

  try {
    await createAuditEntry(organizationId, {
      user: { connect: { id: session.user.id } },
      entityType: "Study",
      entityId: studyId,
      action: "SHARE_LINK_CREATED",
      changeSet: {
        // DSGVO-Nachverfolgung: WANN wurde ein Link mit welcher Gültigkeit
        // ausgestellt. Wir loggen NICHT den Token selbst (Geheimnis).
        tokenExpiresAt: [null, expiresAt],
        ttlDays: [null, ttlDays],
      },
      ipAddress,
      userAgent,
    });
  } catch (err) {
    console.error("[create-share-link] audit failed", err);
    return { ok: false, errorCode: "server" };
  }

  return {
    ok: true,
    studyId,
    url,
    expiresAt,
  };
}
