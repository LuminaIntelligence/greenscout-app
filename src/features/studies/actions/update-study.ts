"use server";

/**
 * T-025/T-026 update-study Server Action.
 *
 * Wizard-step autosave + single-page-save entry point.
 * Responsibilities:
 *
 *   - re-fetch the session for `userId` + `organizationId`,
 *   - read-first ownership check via `findStudyById(orgId, id)` so we
 *     can distinguish `not-found` from cross-tenant / wrong-consultant
 *     BEFORE writing,
 *   - **per-step validation**: the client posts a Step-K patch
 *     (`{ stepKey, data }`); the action picks the matching zod
 *     schema and validates only the fields in that step. The
 *     full-study composition is gated by `transition-status.ts`
 *     (DRAFT → READY) — not here,
 *   - emit an `UPDATE` AuditLog entry with a per-field diff (only
 *     fields whose new value differs from the persisted value),
 *   - revalidate the dashboard + edit / detail routes,
 *   - return `{ ok: true }` even for no-op diffs (the wizard's
 *     "Weiter" button is allowed to re-submit the same fields).
 *
 * Return type is a discriminated `UpdateStudyResult`. The client
 * maps `errorCode` to copy via `src/i18n/de.ts`.
 *
 * @see DECISIONS.md → "T-025 silent decisions per §14 (consolidated)"
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { step1KundeSchema } from "@/features/studies/schemas/step1-kunde";
import { step2ObjektSchema } from "@/features/studies/schemas/step2-objekt";
import { step3PvInputsSchema } from "@/features/studies/schemas/step3-pv-inputs";
import { step4ModulSpecSchema } from "@/features/studies/schemas/step4-modul-spec";
import { step5SensitivitySchema } from "@/features/studies/schemas/step5-sensitivity";
import { step6TermineSchema } from "@/features/studies/schemas/step6-termine";
import { auth } from "@/lib/auth";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { findStudyById, updateStudy } from "@/lib/repositories/study.repository";

export type UpdateStudyResult =
  | { ok: true; studyId: string }
  | {
      ok: false;
      errorCode: "not-found" | "validation" | "forbidden" | "server";
      fieldErrors?: Record<string, string>;
    };

export type StudyStepKey = "step1" | "step2" | "step3" | "step4" | "step5" | "step6";

const STEP_SCHEMAS = {
  step1: step1KundeSchema,
  step2: step2ObjektSchema,
  step3: step3PvInputsSchema,
  step4: step4ModulSpecSchema,
  step5: step5SensitivitySchema,
  step6: step6TermineSchema,
} as const satisfies Record<StudyStepKey, z.ZodTypeAny>;

/**
 * Map a parsed step's keys to the fields they update on the Study
 * row. The relation seam: Step 1 updates the `customer` connect, not
 * a column. Everything else writes through 1:1.
 */
/**
 * Re-typed locally as `Record<string, unknown>` instead of
 * `Prisma.StudyUpdateInput` because ESLint `no-restricted-imports`
 * keeps `@/generated/prisma` types in the repository layer (see
 * DECISIONS T-014). The repository's `updateStudy` casts the patch
 * to the Prisma type at its own boundary.
 */
function toUpdateData(
  stepKey: StudyStepKey,
  data: Record<string, unknown>,
): Record<string, unknown> {
  if (stepKey === "step1") {
    return { customer: { connect: { id: data.customerId as string } } };
  }
  // Step 2..6 fields are all flat columns on Study with matching
  // names. The schemas validated shape + types; we hand the data
  // through verbatim. (`Date` for Step 6, `number` for the others,
  // `string` for Step 2.)
  return data;
}

/**
 * Compute a per-field diff between the existing Study row and the
 * step's parsed data. Only fields that differ produce an audit
 * `changeSet` entry. Date and Decimal values are compared by
 * their primitive form so a `Decimal(0)` ↔ `0` no-op doesn't show
 * as a change.
 */
type DiffValue = string | number | null;
type ChangeSet = Record<string, [DiffValue, DiffValue]>;

function buildDiff(
  existing: Record<string, unknown>,
  next: Record<string, unknown>,
  stepKey: StudyStepKey,
): ChangeSet {
  const diff: ChangeSet = {};
  // For Step 1 the only field in `next` is `customerId`; on the row
  // it lives as `customerId` directly. For other steps the keys match.
  for (const [field, newValue] of Object.entries(next)) {
    const oldRaw = existing[field];
    const oldNormalised = normaliseForDiff(oldRaw);
    const newNormalised = normaliseForDiff(newValue);
    if (oldNormalised !== newNormalised) {
      diff[field] = [oldNormalised, newNormalised];
    }
  }
  // Suppress audit noise for Step 1 if the customer connect resolves
  // to the same id already on the row. `existing.customerId` is a
  // NOT-NULL FK at the schema level, so we don't need a `?? null`
  // fallback here.
  if (stepKey === "step1") {
    const oldId = existing.customerId as string;
    const newId = next.customerId as string;
    if (oldId === newId) {
      delete diff.customerId;
    } else {
      diff.customerId = [oldId, newId];
    }
  }
  return diff;
}

function normaliseForDiff(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return value;
  if (typeof value === "string") return value;
  // Prisma Decimal exposes `.toString()`; that's the comparable form
  // for the audit diff (and matches the audit-log JSON serialisation).
  if (typeof value === "object" && value !== null && "toString" in value) {
    return String(value);
  }
  return null;
}

const inputSchema = z.object({
  studyId: z.string().min(1),
  stepKey: z.enum(["step1", "step2", "step3", "step4", "step5", "step6"]),
  data: z.unknown(),
});

export async function updateStudyAction(rawInput: unknown): Promise<UpdateStudyResult> {
  const envelope = inputSchema.safeParse(rawInput);
  if (!envelope.success) {
    return { ok: false, errorCode: "server" };
  }

  const session = await auth();
  if (!session?.user) {
    return { ok: false, errorCode: "forbidden" };
  }

  const { studyId, stepKey, data } = envelope.data;

  const stepSchema = STEP_SCHEMAS[stepKey];
  const parsed = stepSchema.safeParse(data);
  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.reduce<Record<string, string>>((acc, issue) => {
      acc[issue.path.join(".")] = issue.message;
      return acc;
    }, {});
    return { ok: false, errorCode: "validation", fieldErrors };
  }

  // Ownership check. `findStudyById` filters by org + deletedAt:null.
  const existing = await findStudyById(session.user.organizationId, studyId);
  if (existing === null) {
    return { ok: false, errorCode: "not-found" };
  }

  // BERATER may only edit their own studies (F6 hand-over is T-030);
  // ADMIN has god-mode per SPEC §4.3 F7.
  if (session.user.role !== "ADMIN" && existing.consultantId !== session.user.id) {
    return { ok: false, errorCode: "forbidden" };
  }

  const next = parsed.data as Record<string, unknown>;
  const diff = buildDiff(existing as unknown as Record<string, unknown>, next, stepKey);

  if (Object.keys(diff).length === 0) {
    // Idempotent no-op: the step's "Weiter" button can be re-clicked
    // without churn.
    return { ok: true, studyId };
  }

  const headerList = await headers();
  const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent") ?? null;

  try {
    await updateStudy(session.user.organizationId, studyId, toUpdateData(stepKey, next));

    await createAuditEntry(session.user.organizationId, {
      user: { connect: { id: session.user.id } },
      entityType: "Study",
      entityId: studyId,
      action: "UPDATE",
      changeSet: diff,
      ipAddress,
      userAgent,
    });

    revalidatePath("/studies");
    revalidatePath(`/studies/${studyId}`);
    revalidatePath(`/studies/${studyId}/edit`);
    return { ok: true, studyId };
  } catch (err) {
    console.error("[update-study]", err);
    return { ok: false, errorCode: "server" };
  }
}
