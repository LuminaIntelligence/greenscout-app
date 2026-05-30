/**
 * T-035 — Tests for the Python service client.
 *
 * 100 % coverage on `src/lib/python-service-client.ts`. Uses Vitest's
 * `vi.stubGlobal` to mock `fetch` and `vi.stubEnv` to drive env-based
 * branches (URL/API-key/timeout config).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DerivedValues, StudyCalcInput } from "@/lib/calculations/types";

import {
  __internals,
  callCalc,
  callDocumentsGenerate,
  callProcessImage,
  type DocumentGenerateInput,
} from "@/lib/python-service-client";

const _API_KEY = "test-fake-not-a-secret-fixture-value-only"; // gitleaks:allow

const validInput: StudyCalcInput = {
  anlageKwp: 100,
  pvErzeugungKwhJahr: 95_000,
  pvEigenverbrauchKwhJahr: 60_000,
  pvVerkaufEurKwh: 0.08,
  verbrauchKwhJahr: 80_000,
  versorgerPreisEurKwh: 0.35,
  pachtEurProKwp: 100,
  vertragslaufzeitJahre: 20,
  co2Override: false,
};

const validDerivedValues: DerivedValues = {
  ersparnisProJahr: 16200,
  ersparnisProMonat: 1350,
  ersparnis20Jahre: 324000,
  pachtEinnahmeEinmalig: 200000,
  gesamterzeugung20j: 1_900_000,
  gesamtvorteil: 524000,
  co2TonnenProJahr: 45.03,
  co2HektarMischwald: 0.797,
  co2FussballfelderProJahr: 1.02,
  pvEigenverbrauchKwhGesamtVertragslaufzeit: 1_200_000,
  stromkostenOhnePvEurJahr: 28000,
  stromkostenMitPvEurJahr: 19000,
};

const validDocsInput: DocumentGenerateInput = {
  study: validInput,
  derivedValues: validDerivedValues,
  customerName: "Max Mustermann",
  objectName: "Einkaufszentrum Linzgau",
  consultantName: "Erika Beraterin",
  imageBeforePath: null,
  imageAfterPath: null,
  // Defekte D1+D2+D3 phrase keys — defaults to empty (no fixture data).
  flurstueckPhrase: "",
  flurstueckLabelPhrase: "",
  termin1Phrase: "",
  termin2Phrase: "",
  terminOderPhrase: "",
  modulInfoPhrase: "100 kWp",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.stubEnv("PYTHON_SERVICE_URL", "http://pyservice:8000");
  vi.stubEnv("PYTHON_SERVICE_API_KEY", _API_KEY);
  vi.stubEnv("PYTHON_SERVICE_TIMEOUT_SECONDS", "30");
  // Silence the permanent diagnostic `console.error` lines from
  // `callDocumentsGenerate` + the defensive `translateKeys` fallback so
  // they don't flood the test output. The lines themselves are
  // production-only observability and not asserted on (so production
  // logs stay rich without making the unit suite noisy).
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("translation helpers", () => {
  it("camelToSnake converts every uppercase letter to _<lower>", () => {
    expect(__internals.camelToSnake("anlageKwp")).toBe("anlage_kwp");
    expect(__internals.camelToSnake("co2HektarMischwald")).toBe("co2_hektar_mischwald");
    expect(__internals.camelToSnake("plainword")).toBe("plainword");
  });

  it("snakeToCamel reverses camelToSnake", () => {
    expect(__internals.snakeToCamel("anlage_kwp")).toBe("anlageKwp");
    expect(__internals.snakeToCamel("co2_hektar_mischwald")).toBe("co2HektarMischwald");
    expect(__internals.snakeToCamel("plainword")).toBe("plainword");
  });

  it("translateKeys applies the supplied converter to every top-level key", () => {
    const out = __internals.translateKeys(
      { anlageKwp: 100, pvErzeugungKwhJahr: 200 },
      __internals.camelToSnake,
    );
    expect(out).toEqual({ anlage_kwp: 100, pv_erzeugung_kwh_jahr: 200 });
  });

  it("translateKeys returns {} and logs when given null (defensive branch)", () => {
    const out = __internals.translateKeys(
      null as unknown as Record<string, unknown>,
      __internals.camelToSnake,
    );
    expect(out).toEqual({});
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("[translateKeys] received null/undefined"),
    );
  });

  it("translateKeys returns {} and logs when given undefined (defensive branch)", () => {
    const out = __internals.translateKeys(
      undefined as unknown as Record<string, unknown>,
      __internals.camelToSnake,
    );
    expect(out).toEqual({});
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("[translateKeys] received null/undefined"),
    );
  });
});

describe("resolveEnv", () => {
  it("throws when PYTHON_SERVICE_URL is unset", () => {
    vi.stubEnv("PYTHON_SERVICE_URL", "");
    expect(() => __internals.resolveEnv()).toThrow(/PYTHON_SERVICE_URL/);
  });

  it("throws when PYTHON_SERVICE_API_KEY is unset", () => {
    vi.stubEnv("PYTHON_SERVICE_API_KEY", "");
    expect(() => __internals.resolveEnv()).toThrow(/PYTHON_SERVICE_API_KEY/);
  });

  it("strips trailing slash from URL", () => {
    vi.stubEnv("PYTHON_SERVICE_URL", "http://pyservice:8000/");
    expect(__internals.resolveEnv().url).toBe("http://pyservice:8000");
  });

  it("falls back to 60-second default when timeout env is missing", () => {
    vi.stubEnv("PYTHON_SERVICE_TIMEOUT_SECONDS", "");
    expect(__internals.resolveEnv().timeoutMs).toBe(60000);
  });

  it("falls back to 60-second default when timeout env is unset (undefined)", () => {
    // `vi.stubEnv("KEY", undefined)` actually deletes the key in jsdom, so
    // the nullish-coalescing fallback branch is exercised here.
    vi.stubEnv("PYTHON_SERVICE_TIMEOUT_SECONDS", undefined as unknown as string);
    expect(__internals.resolveEnv().timeoutMs).toBe(60000);
  });

  it("falls back to 60-second default when timeout env is invalid", () => {
    vi.stubEnv("PYTHON_SERVICE_TIMEOUT_SECONDS", "not-a-number");
    expect(__internals.resolveEnv().timeoutMs).toBe(60000);
  });

  it("falls back to 60-second default when timeout env is zero or negative", () => {
    vi.stubEnv("PYTHON_SERVICE_TIMEOUT_SECONDS", "0");
    expect(__internals.resolveEnv().timeoutMs).toBe(60000);
  });
});

describe("callCalc", () => {
  it("translates camelCase input -> snake_case body, sends X-API-Key, returns translated camelCase output", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("http://pyservice:8000/api/calc");
      expect(init?.method).toBe("POST");
      const headers = init?.headers as Record<string, string>;
      expect(headers["X-API-Key"]).toBe(_API_KEY);
      expect(headers["Content-Type"]).toBe("application/json");
      const body = JSON.parse(init?.body as string) as Record<string, unknown>;
      expect(body.anlage_kwp).toBe(100);
      expect(body.pv_erzeugung_kwh_jahr).toBe(95_000);
      expect(body.co2_override).toBe(false);
      return jsonResponse(200, {
        ersparnis_pro_jahr: 16200,
        ersparnis_pro_monat: 1350,
        ersparnis20_jahre: 324000,
        pacht_einnahme_einmalig: 200000,
        gesamterzeugung20j: 1_900_000,
        gesamtvorteil: 524000,
        co2_tonnen_pro_jahr: 45.03,
        co2_hektar_mischwald: 0.797,
        co2_fussballfelder_pro_jahr: 1.02,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callCalc(validInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.ersparnisProJahr).toBe(16200);
      expect(result.data.co2HektarMischwald).toBe(0.797);
      expect(result.data.co2FussballfelderProJahr).toBe(1.02);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns ok=false kind='unauthorized' on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(401, { detail: "nope" })),
    );
    const result = await callCalc(validInput);
    expect(result).toEqual({
      ok: false,
      kind: "unauthorized",
      status: 401,
      message: expect.stringContaining("401"),
    });
  });

  it("returns ok=false kind='validation' on 422", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(422, { detail: "validation" })),
    );
    const result = await callCalc(validInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("validation");
    }
  });

  it("returns ok=false kind='server-error' on 500", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(500, { detail: "boom" })),
    );
    const result = await callCalc(validInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("server-error");
    }
  });

  it("returns ok=false kind='bad-request' on 400", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(400, { detail: "bad" })),
    );
    const result = await callCalc(validInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("bad-request");
    }
  });

  it("returns ok=false kind='not-implemented' on 501", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(501, { status: "pending" })),
    );
    const result = await callCalc(validInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("not-implemented");
    }
  });

  it("returns ok=false kind='timeout' when fetch aborts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      }),
    );
    const result = await callCalc(validInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("timeout");
    }
  });

  it("returns ok=false kind='network' on generic fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("DNS-Fehler");
      }),
    );
    const result = await callCalc(validInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("network");
      expect(result.message).toBe("DNS-Fehler");
    }
  });

  it("returns ok=false kind='network' with fallback message on non-Error throw", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw "string-not-error";
      }),
    );
    const result = await callCalc(validInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("network");
      expect(result.message).toContain("Netzwerkfehler");
    }
  });

  it("survives a 200 response with invalid JSON (empty body)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("not-json", {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
    const result = await callCalc(validInput);
    // Result is "ok:true" with an empty object — translateKeys handles {} fine.
    expect(result.ok).toBe(true);
  });

  it("actually fires the timeout setTimeout callback (abort branch reached)", async () => {
    // Drive timeout to 1ms and let fetch hang long enough for the timer to
    // fire `controller.abort()` from inside setTimeout. The Response then
    // gets rejected with an AbortError, which our handler maps to
    // kind='timeout'.
    vi.stubEnv("PYTHON_SERVICE_TIMEOUT_SECONDS", "0.001");
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      }),
    );
    const result = await callCalc(validInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("timeout");
    }
  });
});

describe("callDocumentsGenerate", () => {
  it("nests study + derived_values, translates the whole tree to snake_case, sends X-API-Key", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("http://pyservice:8000/api/documents/generate");
      const headers = init?.headers as Record<string, string>;
      expect(headers["X-API-Key"]).toBe(_API_KEY);
      const body = JSON.parse(init?.body as string) as Record<string, unknown>;
      expect(body.customer_name).toBe("Max Mustermann");
      expect(body.object_name).toBe("Einkaufszentrum Linzgau");
      expect(body.consultant_name).toBe("Erika Beraterin");
      const study = body.study as Record<string, unknown>;
      expect(study.anlage_kwp).toBe(100);
      expect(study.co2_override).toBe(false);
      const derived = body.derived_values as Record<string, unknown>;
      expect(derived.ersparnis_pro_jahr).toBe(16200);
      // Slice 3a always returns 501.
      return jsonResponse(501, {
        status: "pending",
        message: "Slice 3b later",
        blocking_task: "T-037",
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callDocumentsGenerate(validDocsInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("not-implemented");
    }
  });

  it("translates a hypothetical 200 response to camelCase output", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(200, {
          pptx_path: "/generated/x.pptx",
          pdf_path: "/generated/x.pdf",
          generated_at: "2026-05-26T10:00:00Z",
        }),
      ),
    );

    const result = await callDocumentsGenerate(validDocsInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.pptxPath).toBe("/generated/x.pptx");
      expect(result.data.pdfPath).toBe("/generated/x.pdf");
      expect(result.data.generatedAt).toBe("2026-05-26T10:00:00Z");
    }
  });

  it("returns ok=false kind='timeout' when documents/generate aborts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      }),
    );
    const result = await callDocumentsGenerate(validDocsInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("timeout");
    }
  });

  it("returns ok=false kind='network' on generic fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("connection refused");
      }),
    );
    const result = await callDocumentsGenerate(validDocsInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("network");
    }
  });

  it("returns ok=false kind='network' with fallback message on non-Error throw", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw "not-an-error";
      }),
    );
    const result = await callDocumentsGenerate(validDocsInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("network");
      expect(result.message).toContain("Netzwerkfehler");
    }
  });

  it("logs the diagnostic outbound body line before posting (non-truncated branch)", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, {
        pptx_path: "/generated/x.pptx",
        pdf_path: "/generated/x.pdf",
        generated_at: "2026-05-26T10:00:00Z",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    // Hand-rolled minimal input with a small body so the non-truncated
    // branch fires (serialised wireBody well under 800 chars).
    const smallInput: DocumentGenerateInput = {
      ...validDocsInput,
      study: { anlageKwp: 1 } as unknown as StudyCalcInput,
      derivedValues: { ersparnisProJahr: 1 } as unknown as DerivedValues,
      customerName: "A",
      objectName: "B",
      consultantName: "C",
      imageBeforePath: null,
      imageAfterPath: null,
    };
    await callDocumentsGenerate(smallInput);

    const logCalls = (console.error as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const outboundLine = logCalls.find(
      (call) =>
        typeof call[0] === "string" && call[0].includes("[callDocumentsGenerate] outbound body"),
    );
    expect(outboundLine).toBeDefined();
    expect(outboundLine?.[1]).not.toContain("…[truncated]");
  });

  it("truncates the diagnostic log to 800 chars on large bodies", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, {
        pptx_path: "/generated/x.pptx",
        pdf_path: "/generated/x.pdf",
        generated_at: "2026-05-26T10:00:00Z",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    // Inflate the input by stuffing a long object_name to push the
    // serialised body well past 800 chars.
    const longInput: DocumentGenerateInput = {
      ...validDocsInput,
      objectName: "X".repeat(2000),
    };
    await callDocumentsGenerate(longInput);

    const logCalls = (console.error as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const outboundLine = logCalls.find(
      (call) =>
        typeof call[0] === "string" && call[0].includes("[callDocumentsGenerate] outbound body"),
    );
    expect(outboundLine).toBeDefined();
    expect(outboundLine?.[1]).toContain("…[truncated]");
    // The truncated string itself is 800 chars + suffix; assert the
    // 800-char slice is preserved.
    const payload = outboundLine?.[1] as string;
    expect(payload.length).toBe(800 + "…[truncated]".length);
  });

  it("short-circuits with validation when input.study is empty", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await callDocumentsGenerate({
      ...validDocsInput,
      study: {} as unknown as StudyCalcInput,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("validation");
      expect(result.status).toBe(0);
      expect(result.message).toContain("input.study ist leer");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("short-circuits with validation when input.study is null", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await callDocumentsGenerate({
      ...validDocsInput,
      study: null as unknown as StudyCalcInput,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("validation");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("short-circuits with validation when input.study is undefined", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await callDocumentsGenerate({
      ...validDocsInput,
      study: undefined as unknown as StudyCalcInput,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("validation");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("short-circuits with validation when input.derivedValues is empty", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await callDocumentsGenerate({
      ...validDocsInput,
      derivedValues: {} as unknown as DerivedValues,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("validation");
      expect(result.status).toBe(0);
      expect(result.message).toContain("derivedValues ist leer");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("short-circuits with validation when input.derivedValues is null", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await callDocumentsGenerate({
      ...validDocsInput,
      derivedValues: null as unknown as DerivedValues,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("validation");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("short-circuits with validation when input.derivedValues is undefined", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await callDocumentsGenerate({
      ...validDocsInput,
      derivedValues: undefined as unknown as DerivedValues,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("validation");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("callProcessImage", () => {
  it("posts the absolute path, sends X-API-Key, returns camelCase metadata", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("http://pyservice:8000/api/images/process");
      const headers = init?.headers as Record<string, string>;
      expect(headers["X-API-Key"]).toBe(_API_KEY);
      const body = JSON.parse(init?.body as string) as Record<string, unknown>;
      expect(body.image_path).toBe("/uploads/studies/abc/before-1.jpg");
      expect(body.max_dimension_px).toBe(2000);
      return jsonResponse(200, {
        width_px: 2000,
        height_px: 1200,
        file_size_bytes: 451200,
        mime_type: "image/jpeg",
        processed: true,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callProcessImage({
      imagePath: "/uploads/studies/abc/before-1.jpg",
      maxDimensionPx: 2000,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.widthPx).toBe(2000);
      expect(result.data.heightPx).toBe(1200);
      expect(result.data.fileSizeBytes).toBe(451200);
      expect(result.data.mimeType).toBe("image/jpeg");
      expect(result.data.processed).toBe(true);
    }
  });

  it("omits max_dimension_px from the wire body when not provided", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string) as Record<string, unknown>;
      expect(body).not.toHaveProperty("max_dimension_px");
      expect(body.image_path).toBe("/uploads/x.png");
      return jsonResponse(200, {
        width_px: 800,
        height_px: 600,
        file_size_bytes: 100_000,
        mime_type: "image/png",
        processed: false,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callProcessImage({ imagePath: "/uploads/x.png" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.processed).toBe(false);
    }
  });

  it("maps 422 to kind='validation'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(422, { detail: "format not in whitelist" })),
    );
    const result = await callProcessImage({ imagePath: "/uploads/bad.gif" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("validation");
      expect(result.status).toBe(422);
    }
  });

  it("maps 400 to kind='bad-request'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(400, { detail: "path traversal" })),
    );
    const result = await callProcessImage({ imagePath: "/etc/passwd" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("bad-request");
    }
  });

  it("maps 404 to kind='bad-request' (4xx fallback)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(404, { detail: "missing" })),
    );
    const result = await callProcessImage({ imagePath: "/uploads/ghost.jpg" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("bad-request");
    }
  });

  it("maps 401 to kind='unauthorized'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(401, { detail: "Missing X-API-Key" })),
    );
    const result = await callProcessImage({ imagePath: "/uploads/x.jpg" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("unauthorized");
    }
  });

  it("returns ok=false kind='timeout' when fetch aborts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      }),
    );
    const result = await callProcessImage({ imagePath: "/uploads/x.jpg" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("timeout");
    }
  });

  it("returns ok=false kind='network' on generic fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );
    const result = await callProcessImage({ imagePath: "/uploads/x.jpg" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("network");
      expect(result.message).toContain("ECONNREFUSED");
    }
  });

  it("returns ok=false kind='network' with fallback message on non-Error throw", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw "not-an-error";
      }),
    );
    const result = await callProcessImage({ imagePath: "/uploads/x.jpg" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("network");
      expect(result.message).toContain("Netzwerkfehler");
    }
  });
});
