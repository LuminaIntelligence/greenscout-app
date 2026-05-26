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
        ersparnis_20_jahre: 324000,
        pacht_einnahme_einmalig: 200000,
        gesamterzeugung_20j: 1_900_000,
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
});
