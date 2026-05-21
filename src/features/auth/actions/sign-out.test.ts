import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the auth module to capture how signOutAction calls Auth.js.
vi.mock("@/lib/auth", () => ({
  signOut: vi.fn(async () => undefined),
}));

import { signOut } from "@/lib/auth";

import { signOutAction } from "./sign-out";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signOutAction", () => {
  it("delegates to Auth.js signOut with redirectTo: /login", async () => {
    await signOutAction();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/login" });
  });

  it("propagates errors from the underlying signOut call", async () => {
    const error = new Error("auth boom");
    vi.mocked(signOut).mockRejectedValueOnce(error);
    await expect(signOutAction()).rejects.toThrow("auth boom");
  });
});
