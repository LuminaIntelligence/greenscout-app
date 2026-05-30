/**
 * T-035 — Next.js client for the Python FastAPI service.
 *
 * The Python service is stateless. Next.js owns the DB via Prisma and
 * sends the full request body verbatim. Auth is a shared secret in the
 * `X-API-Key` header (validated by `app.api.dependencies.verify_api_key`
 * on the Python side; sourced from `PYTHON_SERVICE_API_KEY` env on both).
 *
 * The TS surface uses camelCase by convention; the Python side uses
 * snake_case. This module owns the translation in both directions —
 * callers see typed camelCase inputs/outputs and never have to think
 * about the wire format.
 *
 * Timeout: bounded by `PYTHON_SERVICE_TIMEOUT_SECONDS` (default 60s)
 * so a stuck pyservice never wedges a Next.js request handler.
 *
 * @see SPEC.md §7.1 (internal HTTP between Next.js and the Python service)
 * @see services/python/app/api/endpoints/calc.py (server side)
 * @see DECISIONS "T-035 silent decisions per §14" (translator strategy)
 */

import type { DerivedValues, StudyCalcInput } from "@/lib/calculations/types";

const DEFAULT_TIMEOUT_SECONDS = 60;

/** Discriminated union returned to callers — never throw raw `fetch` errors out. */
export type PythonServiceCallResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      kind:
        | "unauthorized"
        | "bad-request"
        | "validation"
        | "not-implemented"
        | "server-error"
        | "timeout"
        | "network";
      status?: number;
      message: string;
    };

/** Internal: resolve env at call-time so tests can monkeypatch. */
function resolveEnv(): { url: string; apiKey: string; timeoutMs: number } {
  const url = process.env.PYTHON_SERVICE_URL;
  const apiKey = process.env.PYTHON_SERVICE_API_KEY;
  if (!url) {
    throw new Error("PYTHON_SERVICE_URL is not configured.");
  }
  if (!apiKey) {
    throw new Error("PYTHON_SERVICE_API_KEY is not configured.");
  }
  const timeoutSeconds = Number(
    process.env.PYTHON_SERVICE_TIMEOUT_SECONDS ?? DEFAULT_TIMEOUT_SECONDS,
  );
  const timeoutMs =
    Number.isFinite(timeoutSeconds) && timeoutSeconds > 0
      ? timeoutSeconds * 1000
      : DEFAULT_TIMEOUT_SECONDS * 1000;
  return { url: url.replace(/\/$/, ""), apiKey, timeoutMs };
}

/**
 * Convert a camelCase key to snake_case.
 *
 * Plain-ASCII identifiers only — the calc schema (StudyCalcInput,
 * DerivedValues) is all-ASCII, so we don't need Unicode handling.
 */
function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

/**
 * Convert a snake_case key to camelCase.
 *
 * Inverse of `camelToSnake`. Stops at digits to keep `co2_tonnen` -> `co2Tonnen`
 * (digits don't trigger a case flip).
 */
function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Shallow-convert a record's keys, preserving values.
 *
 * Calc inputs/outputs are flat objects; nested object translation is
 * handled at the call site (see `callDocumentsGenerate`).
 *
 * Defensive: if the caller hands in `null` or `undefined`, log + return
 * `{}` instead of throwing. The post-mortem on the production 422-on-
 * /api/documents/generate trail showed that an empty study sub-object
 * surfaces downstream as pydantic's `Field required` on every required
 * leaf — surfacing the empty input at the boundary makes that mode
 * diagnosable from one log line instead of a wall of pydantic detail.
 */
function translateKeys<T extends Record<string, unknown>>(
  obj: T | null | undefined,
  translate: (key: string) => string,
): Record<string, unknown> {
  if (obj === null || obj === undefined) {
    console.error("[translateKeys] received null/undefined obj — returning empty object");
    return {};
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[translate(k)] = v;
  }
  return out;
}

/** Internal: POST JSON with timeout + X-API-Key. */
async function postJson(path: string, body: unknown): Promise<{ status: number; json: unknown }> {
  const { url, apiKey, timeoutMs } = resolveEnv();
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetch(`${url}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json: unknown = await response.json().catch(() => ({}));
    return { status: response.status, json };
  } finally {
    clearTimeout(timer);
  }
}

/** Map an HTTP status to a typed error `kind`. */
function statusToKind(
  status: number,
): Exclude<
  PythonServiceCallResult<unknown>["ok"] extends true
    ? never
    : Extract<PythonServiceCallResult<unknown>, { ok: false }>["kind"],
  "timeout" | "network"
> {
  if (status === 401) return "unauthorized";
  if (status === 422) return "validation";
  if (status === 501) return "not-implemented";
  if (status >= 500) return "server-error";
  return "bad-request";
}

/**
 * POST /api/calc — run the authoritative calc pipeline on the Python side.
 *
 * Returns a discriminated result. On `ok: true` the `data` field is the
 * fully-typed `DerivedValues` (camelCase). On `ok: false` the caller can
 * dispatch on `kind` to surface a banner or toast per SPEC §4.9.
 */
export async function callCalc(
  input: StudyCalcInput,
): Promise<PythonServiceCallResult<DerivedValues>> {
  const wireBody = translateKeys(input as unknown as Record<string, unknown>, camelToSnake);
  let result: { status: number; json: unknown };
  try {
    result = await postJson("/api/calc", wireBody);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, kind: "timeout", message: "Python-Service-Aufruf hat Timeout erreicht." };
    }
    const message = err instanceof Error ? err.message : "Unbekannter Netzwerkfehler";
    return { ok: false, kind: "network", message };
  }

  if (result.status !== 200) {
    return {
      ok: false,
      kind: statusToKind(result.status),
      status: result.status,
      message: `Python-Service antwortete mit Status ${result.status}.`,
    };
  }

  const wireData = result.json as Record<string, unknown>;
  const data = translateKeys(wireData, snakeToCamel) as unknown as DerivedValues;
  return { ok: true, data };
}

/**
 * Inputs to `callDocumentsGenerate`. Slice 3a always returns
 * `not-implemented` (501); the shape is stable so the wiring can ship
 * now.
 */
export interface DocumentGenerateInput {
  study: StudyCalcInput;
  derivedValues: DerivedValues;
  customerName: string;
  objectName: string;
  consultantName: string;
  imageBeforePath: string | null;
  imageAfterPath: string | null;
  /**
   * Empty-value-safe phrase keys (Defekte D1+D2+D3, 2026-05-29).
   * Server Action pre-renders each phrase; empty string means the
   * surrounding template prefix/suffix vanishes with the value.
   * See `src/features/studies/actions/generate-document.ts` for the
   * builder helpers.
   */
  flurstueckPhrase: string;
  flurstueckLabelPhrase: string;
  termin1Phrase: string;
  termin2Phrase: string;
  terminOderPhrase: string;
  modulInfoPhrase: string;
}

/** Output of `callDocumentsGenerate` when Slice 3b lands. */
export interface DocumentGenerateOutput {
  pptxPath: string;
  pdfPath: string;
  generatedAt: string; // ISO-8601 UTC.
}

/**
 * POST /api/documents/generate — Slice 3a: always returns 501
 * (`kind: "not-implemented"`).
 *
 * The full pipeline lands in Slice 3b after the user signs off on
 * `docs/pptx-mapping.md`. The TS shape + translation are ready so
 * Slice 3b only needs to flip the Python side.
 */
export async function callDocumentsGenerate(
  input: DocumentGenerateInput,
): Promise<PythonServiceCallResult<DocumentGenerateOutput>> {
  // Defensive — surface empty calc-input at the boundary instead of
  // letting it travel as `study: {}` / `derived_values: {}` into a
  // pyservice 422 with `loc: ["body", "study"]` + `type: "missing"`.
  // Documented post-mortem: production-debug 2026-05-27.
  if (input.study === null || input.study === undefined || Object.keys(input.study).length === 0) {
    console.error("[callDocumentsGenerate] input.study is empty/null/undefined:", input.study);
    return {
      ok: false,
      kind: "validation",
      status: 0,
      message: "Calc-Input fehlt — input.study ist leer.",
    };
  }
  if (
    input.derivedValues === null ||
    input.derivedValues === undefined ||
    Object.keys(input.derivedValues).length === 0
  ) {
    console.error(
      "[callDocumentsGenerate] input.derivedValues is empty/null/undefined:",
      input.derivedValues,
    );
    return {
      ok: false,
      kind: "validation",
      status: 0,
      message: "Calc-Output fehlt — derivedValues ist leer.",
    };
  }

  const wireBody = {
    study: translateKeys(input.study as unknown as Record<string, unknown>, camelToSnake),
    derived_values: translateKeys(
      input.derivedValues as unknown as Record<string, unknown>,
      camelToSnake,
    ),
    customer_name: input.customerName,
    object_name: input.objectName,
    consultant_name: input.consultantName,
    image_before_path: input.imageBeforePath,
    image_after_path: input.imageAfterPath,
    // Empty-value-safe phrase keys — Defekte D1+D2+D3 (2026-05-29).
    flurstueck_phrase: input.flurstueckPhrase,
    flurstueck_label_phrase: input.flurstueckLabelPhrase,
    termin_1_phrase: input.termin1Phrase,
    termin_2_phrase: input.termin2Phrase,
    termin_oder_phrase: input.terminOderPhrase,
    modul_info_phrase: input.modulInfoPhrase,
  };

  // Diagnostic log — sichtbar in container logs für Production-Debugging.
  // Truncated auf 800 chars um große studies + derived_values + bilder-paths
  // nicht den Log-Stream zu fluten. Permanent — Slice 3b/Hotfix post-mortem
  // (2026-05-27): pyservice-422 ohne body-trace ist nicht diagnostizierbar.
  const wireBodyJson = JSON.stringify(wireBody);
  console.error(
    "[callDocumentsGenerate] outbound body (truncated 800):",
    wireBodyJson.length > 800 ? wireBodyJson.slice(0, 800) + "…[truncated]" : wireBodyJson,
  );

  let result: { status: number; json: unknown };
  try {
    result = await postJson("/api/documents/generate", wireBody);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, kind: "timeout", message: "Python-Service-Aufruf hat Timeout erreicht." };
    }
    const message = err instanceof Error ? err.message : "Unbekannter Netzwerkfehler";
    return { ok: false, kind: "network", message };
  }

  if (result.status !== 200) {
    return {
      ok: false,
      kind: statusToKind(result.status),
      status: result.status,
      message: `Python-Service antwortete mit Status ${result.status}.`,
    };
  }

  const wireData = result.json as Record<string, unknown>;
  return {
    ok: true,
    data: {
      pptxPath: String(wireData.pptx_path),
      pdfPath: String(wireData.pdf_path),
      generatedAt: String(wireData.generated_at),
    },
  };
}

/**
 * Inputs to `callProcessImage` (Slice 4 / T-029b).
 *
 * The `imagePath` field is the container-internal absolute path to a
 * file the Next.js side has just written to the shared `UPLOADS_DIR`
 * volume. The Python side refuses to touch any path outside that root.
 */
export interface ImageProcessInput {
  imagePath: string;
  /** Largest allowed dimension after processing. Defaults to 4000 on the Python side. */
  maxDimensionPx?: number;
}

/** Output of `callProcessImage` — metadata of the file as it sits on disk. */
export interface ImageProcessOutput {
  widthPx: number;
  heightPx: number;
  fileSizeBytes: number;
  mimeType: string;
  processed: boolean;
}

/**
 * POST /api/images/process — inspect + optionally resize an uploaded image.
 *
 * Slice 4 / T-029b. The Next.js upload route writes the file, then
 * calls this with the absolute path. The Python side validates the
 * format (JPEG/PNG/WebP), resizes if oversize (preserving aspect
 * ratio), and returns the post-processing metadata so the upload
 * route can persist the final dimensions / byte size in the
 * `StudyImage` DB row.
 */
export async function callProcessImage(
  input: ImageProcessInput,
): Promise<PythonServiceCallResult<ImageProcessOutput>> {
  const wireBody: Record<string, unknown> = {
    image_path: input.imagePath,
  };
  if (input.maxDimensionPx !== undefined) {
    wireBody.max_dimension_px = input.maxDimensionPx;
  }

  let result: { status: number; json: unknown };
  try {
    result = await postJson("/api/images/process", wireBody);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, kind: "timeout", message: "Python-Service-Aufruf hat Timeout erreicht." };
    }
    const message = err instanceof Error ? err.message : "Unbekannter Netzwerkfehler";
    return { ok: false, kind: "network", message };
  }

  if (result.status !== 200) {
    return {
      ok: false,
      kind: statusToKind(result.status),
      status: result.status,
      message: `Python-Service antwortete mit Status ${result.status}.`,
    };
  }

  const wireData = result.json as Record<string, unknown>;
  return {
    ok: true,
    data: {
      widthPx: Number(wireData.width_px),
      heightPx: Number(wireData.height_px),
      fileSizeBytes: Number(wireData.file_size_bytes),
      mimeType: String(wireData.mime_type),
      processed: Boolean(wireData.processed),
    },
  };
}

/** Internal hooks for tests. Not part of the public API. */
export const __internals = {
  camelToSnake,
  snakeToCamel,
  translateKeys,
  resolveEnv,
};
