/**
 * §7.10-Pivot PR 3 — Tests für `renderStudyToPdf`.
 *
 * Trust-Boundary: 100% coverage required (Playwright-Call ist eine
 * Subprocess-Boundary). Mocked Playwright, mocked fs/promises.
 *
 * Pfade abgedeckt:
 *   - throw bei fehlendem INTERNAL_RENDER_TOKEN.
 *   - chromium.launch wird mit den richtigen Args aufgerufen.
 *   - page.goto wird mit der korrekten URL + Token-Header aufgerufen.
 *   - non-OK response → throw mit Diagnose-Context.
 *   - null response → throw mit "no-response"-Status.
 *   - happy-path returns { filename, absolutePath }.
 *   - browser.close() wird IMMER aufgerufen, auch bei Throw.
 *   - browser.close() error wird geswallowed (orig error survives).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mkdirMock = vi.hoisted(() => vi.fn());
vi.mock("node:fs/promises", () => ({
  mkdir: mkdirMock,
  // default export so node-style imports (`import fs from "node:fs/promises"`)
  // don't crash.
  default: { mkdir: mkdirMock },
}));

interface MockPage {
  goto: ReturnType<typeof vi.fn>;
  evaluate: ReturnType<typeof vi.fn>;
  pdf: ReturnType<typeof vi.fn>;
}
interface MockContext {
  newPage: ReturnType<typeof vi.fn>;
}
interface MockBrowser {
  newContext: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

const browserState: {
  launchMock: ReturnType<typeof vi.fn>;
  page: MockPage;
  context: MockContext;
  browser: MockBrowser;
} = {
  launchMock: vi.fn(),
  page: {} as MockPage,
  context: {} as MockContext,
  browser: {} as MockBrowser,
};

function buildMockBrowser({
  gotoResult,
  closeThrows = false,
}: {
  gotoResult: { ok: boolean; status: number } | null;
  closeThrows?: boolean;
}): MockBrowser {
  const page: MockPage = {
    goto: vi.fn().mockResolvedValue(
      gotoResult === null
        ? null
        : {
            ok: () => gotoResult.ok,
            status: () => gotoResult.status,
          },
    ),
    evaluate: vi.fn().mockResolvedValue(undefined),
    pdf: vi.fn().mockResolvedValue(undefined),
  };
  const context: MockContext = {
    newPage: vi.fn().mockResolvedValue(page),
  };
  const browser: MockBrowser = {
    newContext: vi.fn().mockResolvedValue(context),
    close: closeThrows
      ? vi.fn().mockRejectedValue(new Error("close failed"))
      : vi.fn().mockResolvedValue(undefined),
  };
  browserState.page = page;
  browserState.context = context;
  browserState.browser = browser;
  return browser;
}

vi.mock("playwright", () => ({
  chromium: {
    launch: (...args: unknown[]) =>
      (browserState.launchMock as unknown as (...a: unknown[]) => unknown)(...args),
  },
}));

import { renderStudyToPdf } from "./render-pdf";

describe("renderStudyToPdf — Playwright-PDF-Renderer", () => {
  const ORIGINAL_TOKEN = process.env.INTERNAL_RENDER_TOKEN;
  const ORIGINAL_GEN = process.env.GENERATED_DIR;
  const ORIGINAL_PORT = process.env.PORT;

  beforeEach(() => {
    mkdirMock.mockReset().mockResolvedValue(undefined);
    browserState.launchMock.mockReset();
    process.env.INTERNAL_RENDER_TOKEN = "test-secret-XYZ";
    process.env.GENERATED_DIR = "/tmp/test-generated";
    delete process.env.PORT;
    // Pin Date.now() so the generated filename is deterministic per test.
    vi.spyOn(Date, "now").mockReturnValue(1717_000_000_000);
  });

  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) delete process.env.INTERNAL_RENDER_TOKEN;
    else process.env.INTERNAL_RENDER_TOKEN = ORIGINAL_TOKEN;
    if (ORIGINAL_GEN === undefined) delete process.env.GENERATED_DIR;
    else process.env.GENERATED_DIR = ORIGINAL_GEN;
    if (ORIGINAL_PORT === undefined) delete process.env.PORT;
    else process.env.PORT = ORIGINAL_PORT;
    vi.restoreAllMocks();
  });

  it("throws when INTERNAL_RENDER_TOKEN is missing", async () => {
    delete process.env.INTERNAL_RENDER_TOKEN;

    await expect(renderStudyToPdf("stu_1")).rejects.toThrow(/INTERNAL_RENDER_TOKEN/);
    expect(browserState.launchMock).not.toHaveBeenCalled();
  });

  it("throws when INTERNAL_RENDER_TOKEN is the empty string", async () => {
    process.env.INTERNAL_RENDER_TOKEN = "";

    await expect(renderStudyToPdf("stu_1")).rejects.toThrow(/INTERNAL_RENDER_TOKEN/);
    expect(browserState.launchMock).not.toHaveBeenCalled();
  });

  it("launches Chromium with --disable-dev-shm-usage + --no-sandbox", async () => {
    const browser = buildMockBrowser({ gotoResult: { ok: true, status: 200 } });
    browserState.launchMock.mockResolvedValue(browser);

    await renderStudyToPdf("stu_happy");

    expect(browserState.launchMock).toHaveBeenCalledTimes(1);
    const launchArgs = browserState.launchMock.mock.calls[0][0];
    expect(launchArgs.headless).toBe(true);
    expect(launchArgs.args).toContain("--disable-dev-shm-usage");
    expect(launchArgs.args).toContain("--no-sandbox");
  });

  it("navigates to /internal/render-study/<id> with the token header + 1920x1080 viewport", async () => {
    const browser = buildMockBrowser({ gotoResult: { ok: true, status: 200 } });
    browserState.launchMock.mockResolvedValue(browser);

    await renderStudyToPdf("stu_happy");

    expect(browser.newContext).toHaveBeenCalledTimes(1);
    const contextArgs = browser.newContext.mock.calls[0][0];
    expect(contextArgs.viewport).toEqual({ width: 1920, height: 1080 });
    expect(contextArgs.extraHTTPHeaders).toEqual({
      "x-internal-render-token": "test-secret-XYZ",
    });

    expect(browserState.page.goto).toHaveBeenCalledTimes(1);
    const [url, opts] = browserState.page.goto.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:3000/internal/render-study/stu_happy");
    expect(opts).toEqual({ waitUntil: "networkidle", timeout: 60_000 });
  });

  it("honours the PORT env var when building the target URL", async () => {
    process.env.PORT = "4040";
    const browser = buildMockBrowser({ gotoResult: { ok: true, status: 200 } });
    browserState.launchMock.mockResolvedValue(browser);

    await renderStudyToPdf("stu_port");

    const [url] = browserState.page.goto.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:4040/internal/render-study/stu_port");
  });

  it("URL-encodes the studyId in the navigation URL", async () => {
    const browser = buildMockBrowser({ gotoResult: { ok: true, status: 200 } });
    browserState.launchMock.mockResolvedValue(browser);

    await renderStudyToPdf("stu/strange id");

    const [url] = browserState.page.goto.mock.calls[0];
    expect(url).toBe(
      `http://127.0.0.1:3000/internal/render-study/${encodeURIComponent("stu/strange id")}`,
    );
  });

  it("awaits document.fonts.ready before calling page.pdf", async () => {
    const browser = buildMockBrowser({ gotoResult: { ok: true, status: 200 } });
    browserState.launchMock.mockResolvedValue(browser);

    await renderStudyToPdf("stu_fonts");

    expect(browserState.page.evaluate).toHaveBeenCalledTimes(1);
    expect(browserState.page.pdf).toHaveBeenCalledTimes(1);
    // Evaluate before pdf (mock call order)
    const evaluateOrder = (browserState.page.evaluate.mock.invocationCallOrder ?? [])[0];
    const pdfOrder = (browserState.page.pdf.mock.invocationCallOrder ?? [])[0];
    expect(evaluateOrder).toBeLessThan(pdfOrder);
  });

  it("calls page.pdf with 1920x1080 landscape + printBackground + preferCSSPageSize", async () => {
    const browser = buildMockBrowser({ gotoResult: { ok: true, status: 200 } });
    browserState.launchMock.mockResolvedValue(browser);

    await renderStudyToPdf("stu_pdf");

    expect(browserState.page.pdf).toHaveBeenCalledTimes(1);
    const opts = browserState.page.pdf.mock.calls[0][0];
    expect(opts.width).toBe("1920px");
    expect(opts.height).toBe("1080px");
    expect(opts.landscape).toBe(true);
    expect(opts.printBackground).toBe(true);
    expect(opts.preferCSSPageSize).toBe(true);
    expect(opts.margin).toEqual({ top: "0", right: "0", bottom: "0", left: "0" });
    // path must include the studyId-subdir + deterministic filename.
    expect(opts.path).toContain("stu_pdf");
    expect(opts.path).toMatch(/study-stu_pdf-1717000000000\.pdf$/);
  });

  it("creates the per-study target directory before render", async () => {
    const browser = buildMockBrowser({ gotoResult: { ok: true, status: 200 } });
    browserState.launchMock.mockResolvedValue(browser);

    await renderStudyToPdf("stu_mkdir");

    expect(mkdirMock).toHaveBeenCalledTimes(1);
    const [dir, opts] = mkdirMock.mock.calls[0];
    expect(String(dir)).toContain("stu_mkdir");
    expect(opts).toEqual({ recursive: true });
  });

  it("falls back to ./generated when GENERATED_DIR is unset", async () => {
    delete process.env.GENERATED_DIR;
    const browser = buildMockBrowser({ gotoResult: { ok: true, status: 200 } });
    browserState.launchMock.mockResolvedValue(browser);

    const result = await renderStudyToPdf("stu_default");

    // resolvePath turns ./generated into an absolute path containing 'generated'
    expect(result.absolutePath).toContain("generated");
    expect(result.absolutePath).toContain("stu_default");
  });

  it("falls back to ./generated when GENERATED_DIR is the empty string", async () => {
    process.env.GENERATED_DIR = "";
    const browser = buildMockBrowser({ gotoResult: { ok: true, status: 200 } });
    browserState.launchMock.mockResolvedValue(browser);

    const result = await renderStudyToPdf("stu_emptygendir");

    expect(result.absolutePath).toContain("generated");
    expect(result.absolutePath).toContain("stu_emptygendir");
  });

  it("returns the deterministic filename + absolutePath on the happy path", async () => {
    const browser = buildMockBrowser({ gotoResult: { ok: true, status: 200 } });
    browserState.launchMock.mockResolvedValue(browser);

    const result = await renderStudyToPdf("stu_return");

    expect(result.filename).toBe("study-stu_return-1717000000000.pdf");
    expect(result.absolutePath).toContain("stu_return");
    expect(result.absolutePath).toMatch(/study-stu_return-1717000000000\.pdf$/);
  });

  it("throws with diagnostic context when render-route returns non-OK", async () => {
    const browser = buildMockBrowser({ gotoResult: { ok: false, status: 404 } });
    browserState.launchMock.mockResolvedValue(browser);

    await expect(renderStudyToPdf("stu_404")).rejects.toThrow(
      /404.*INTERNAL_RENDER_TOKEN_SET=true/,
    );
    // browser must still be closed
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it("throws with diagnostic context when page.goto returns null", async () => {
    const browser = buildMockBrowser({ gotoResult: null });
    browserState.launchMock.mockResolvedValue(browser);

    await expect(renderStudyToPdf("stu_null")).rejects.toThrow(
      /no-response.*INTERNAL_RENDER_TOKEN_SET=true/,
    );
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it("closes the browser even when page.pdf throws", async () => {
    const browser = buildMockBrowser({ gotoResult: { ok: true, status: 200 } });
    browserState.page.pdf = vi.fn().mockRejectedValue(new Error("PDF render failed"));
    browserState.context.newPage = vi.fn().mockResolvedValue(browserState.page);
    browser.newContext = vi.fn().mockResolvedValue(browserState.context);
    browserState.launchMock.mockResolvedValue(browser);

    await expect(renderStudyToPdf("stu_pdfthrow")).rejects.toThrow("PDF render failed");
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it("swallows browser.close() errors so original error survives", async () => {
    const browser = buildMockBrowser({
      gotoResult: { ok: false, status: 500 },
      closeThrows: true,
    });
    browserState.launchMock.mockResolvedValue(browser);

    // Expect the ORIGINAL error (non-OK response), not the close error.
    await expect(renderStudyToPdf("stu_closefail")).rejects.toThrow(/500/);
  });

  it("does not crash when chromium.launch itself fails (no close called)", async () => {
    browserState.launchMock.mockRejectedValue(new Error("chromium launch failed"));

    await expect(renderStudyToPdf("stu_launchfail")).rejects.toThrow("chromium launch failed");
    // mkdir was called before launch — but no browser to close.
    expect(mkdirMock).toHaveBeenCalledTimes(1);
  });
});
