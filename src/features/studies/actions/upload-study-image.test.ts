/**
 * Tests for the upload-study-image Server Action (hotfix).
 *
 * The Server Action is a thin FormData → service adapter. All
 * branching logic lives in `processStudyImageUpload` and is covered
 * by `upload-image.test.ts`. The tests here exercise the
 * trust-boundary glue: session check, FormData parsing, header
 * extraction, role mapping, revalidatePath calls, and the typed
 * result shape.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/features/studies/services/upload-image", () => ({
  processStudyImageUpload: vi.fn(),
}));

const headersStore = new Map<string, string | null>();
vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (name: string) => headersStore.get(name.toLowerCase()) ?? null,
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";

import { processStudyImageUpload } from "@/features/studies/services/upload-image";
import { auth } from "@/lib/auth";

import { uploadStudyImageAction } from "./upload-study-image";

const mockedAuth = vi.mocked(auth) as unknown as ReturnType<typeof vi.fn<() => Promise<unknown>>>;
const mockedProcess = vi.mocked(processStudyImageUpload);

const SESSION_BERATER = {
  user: {
    id: "user-1",
    email: "owner@example.com",
    role: "BERATER" as const,
    mustChangePassword: false,
    formPreference: "WIZARD" as const,
    organizationId: "greenscout",
  },
  expires: "2099-01-01T00:00:00.000Z",
};

const SESSION_ADMIN = {
  ...SESSION_BERATER,
  user: { ...SESSION_BERATER.user, id: "admin-1", role: "ADMIN" as const },
};

function makeFile(
  name = "photo.jpg",
  type = "image/jpeg",
  bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
): File {
  return new File([bytes], name, { type });
}

function makeFormData(over: { file?: unknown; kind?: unknown; studyId?: unknown } = {}): FormData {
  const fd = new FormData();
  if (over.file !== null) fd.append("file", (over.file as File | undefined) ?? makeFile());
  if (over.kind !== null) fd.append("kind", (over.kind as string | undefined) ?? "BEFORE");
  if (over.studyId !== null)
    fd.append("studyId", (over.studyId as string | undefined) ?? "study-1");
  return fd;
}

const HAPPY_SERVICE_RESULT = {
  ok: true as const,
  image: {
    id: "img-1",
    kind: "BEFORE" as const,
    widthPx: 800,
    heightPx: 600,
    fileSizeBytes: 12345,
    mimeType: "image/jpeg",
    wasReplacement: false,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  headersStore.clear();
  mockedAuth.mockResolvedValue(SESSION_BERATER);
  mockedProcess.mockResolvedValue(HAPPY_SERVICE_RESULT);
});

describe("uploadStudyImageAction — auth gate", () => {
  it("returns unauthorized when no session", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await uploadStudyImageAction(makeFormData());
    expect(result).toEqual({ ok: false, errorCode: "unauthorized" });
    expect(mockedProcess).not.toHaveBeenCalled();
  });

  it("returns unauthorized when session has no user", async () => {
    mockedAuth.mockResolvedValueOnce({ expires: "2099-01-01" } as never);
    const result = await uploadStudyImageAction(makeFormData());
    expect(result).toEqual({ ok: false, errorCode: "unauthorized" });
  });
});

describe("uploadStudyImageAction — FormData validation", () => {
  it("returns validation when file field is missing", async () => {
    const fd = new FormData();
    fd.append("kind", "BEFORE");
    fd.append("studyId", "study-1");
    const result = await uploadStudyImageAction(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("validation");
      expect(result.message).toBe("missing file");
    }
  });

  it("returns validation when file field is a string (not a File)", async () => {
    const fd = new FormData();
    fd.append("file", "not-a-file");
    fd.append("kind", "BEFORE");
    fd.append("studyId", "study-1");
    const result = await uploadStudyImageAction(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("validation");
  });

  it("returns validation when kind is not BEFORE or AFTER", async () => {
    const fd = new FormData();
    fd.append("file", makeFile());
    fd.append("kind", "INVALID");
    fd.append("studyId", "study-1");
    const result = await uploadStudyImageAction(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("validation");
      expect(result.message).toBe("kind must be BEFORE or AFTER");
    }
  });

  it("returns validation when kind is missing", async () => {
    const fd = new FormData();
    fd.append("file", makeFile());
    fd.append("studyId", "study-1");
    const result = await uploadStudyImageAction(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("validation");
  });

  it("returns validation when studyId is empty string", async () => {
    const fd = new FormData();
    fd.append("file", makeFile());
    fd.append("kind", "BEFORE");
    fd.append("studyId", "");
    const result = await uploadStudyImageAction(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("validation");
      expect(result.message).toBe("missing studyId");
    }
  });

  it("returns validation when studyId is missing", async () => {
    const fd = new FormData();
    fd.append("file", makeFile());
    fd.append("kind", "BEFORE");
    const result = await uploadStudyImageAction(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("validation");
  });
});

describe("uploadStudyImageAction — service delegation", () => {
  it("delegates to processStudyImageUpload with BERATER role + bytes + headers", async () => {
    headersStore.set("x-forwarded-for", "1.2.3.4, 5.6.7.8");
    headersStore.set("user-agent", "TestBrowser/1.0");
    const file = makeFile("photo.jpg", "image/jpeg");
    const result = await uploadStudyImageAction(makeFormData({ file }));

    expect(result.ok).toBe(true);
    expect(mockedProcess).toHaveBeenCalledTimes(1);
    const arg = mockedProcess.mock.calls[0]?.[0];
    expect(arg).toMatchObject({
      userId: "user-1",
      organizationId: "greenscout",
      userRole: "BERATER",
      studyId: "study-1",
      kind: "BEFORE",
      originalFilename: "photo.jpg",
      declaredMimeType: "image/jpeg",
      ipAddress: "1.2.3.4",
      userAgent: "TestBrowser/1.0",
    });
    expect(arg?.bytes).toBeInstanceOf(Uint8Array);
    expect(arg?.bytes.length).toBe(4);
  });

  it("passes ADMIN role when session.user.role is ADMIN", async () => {
    mockedAuth.mockResolvedValueOnce(SESSION_ADMIN);
    await uploadStudyImageAction(makeFormData());
    expect(mockedProcess.mock.calls[0]?.[0].userRole).toBe("ADMIN");
  });

  it("maps unknown role to BERATER (defence-in-depth)", async () => {
    mockedAuth.mockResolvedValueOnce({
      ...SESSION_BERATER,
      user: { ...SESSION_BERATER.user, role: "UNKNOWN" as never },
    });
    await uploadStudyImageAction(makeFormData());
    expect(mockedProcess.mock.calls[0]?.[0].userRole).toBe("BERATER");
  });

  it("defaults ipAddress + userAgent to null when headers are missing", async () => {
    await uploadStudyImageAction(makeFormData());
    const arg = mockedProcess.mock.calls[0]?.[0];
    expect(arg?.ipAddress).toBeNull();
    expect(arg?.userAgent).toBeNull();
  });

  it("forwards AFTER kind", async () => {
    await uploadStudyImageAction(makeFormData({ kind: "AFTER" }));
    expect(mockedProcess.mock.calls[0]?.[0].kind).toBe("AFTER");
  });
});

describe("uploadStudyImageAction — success result", () => {
  it("returns ok with image envelope + url + revalidates routes", async () => {
    const result = await uploadStudyImageAction(makeFormData());
    expect(result).toEqual({
      ok: true,
      image: {
        id: "img-1",
        kind: "BEFORE",
        url: "/api/uploads/img-1",
        widthPx: 800,
        heightPx: 600,
        fileSizeBytes: 12345,
        mimeType: "image/jpeg",
        wasReplacement: false,
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/studies/study-1/edit");
    expect(revalidatePath).toHaveBeenCalledWith("/studies/study-1");
  });

  it("surfaces wasReplacement=true through the envelope", async () => {
    mockedProcess.mockResolvedValueOnce({
      ...HAPPY_SERVICE_RESULT,
      image: { ...HAPPY_SERVICE_RESULT.image, wasReplacement: true },
    });
    const result = await uploadStudyImageAction(makeFormData());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.image.wasReplacement).toBe(true);
  });
});

describe("uploadStudyImageAction — service error propagation", () => {
  it("forwards file-too-large from the service", async () => {
    mockedProcess.mockResolvedValueOnce({
      ok: false,
      errorCode: "file-too-large",
      message: "10485760",
    });
    const result = await uploadStudyImageAction(makeFormData());
    expect(result).toEqual({
      ok: false,
      errorCode: "file-too-large",
      message: "10485760",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("forwards forbidden from the service", async () => {
    mockedProcess.mockResolvedValueOnce({ ok: false, errorCode: "forbidden" });
    const result = await uploadStudyImageAction(makeFormData());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("forbidden");
  });

  it("forwards pyservice errors from the service", async () => {
    mockedProcess.mockResolvedValueOnce({
      ok: false,
      errorCode: "pyservice",
      message: "timeout",
    });
    const result = await uploadStudyImageAction(makeFormData());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("pyservice");
      expect(result.message).toBe("timeout");
    }
  });

  it("forwards service errors without a message", async () => {
    mockedProcess.mockResolvedValueOnce({ ok: false, errorCode: "magic-bytes-mismatch" });
    const result = await uploadStudyImageAction(makeFormData());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("magic-bytes-mismatch");
      expect(result.message).toBeUndefined();
    }
  });
});
