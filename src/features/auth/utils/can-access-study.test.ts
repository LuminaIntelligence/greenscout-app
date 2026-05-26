import { describe, expect, it } from "vitest";

import { canAccessStudy } from "./can-access-study";

import type { Session } from "next-auth";

function makeSession(overrides: Partial<Session["user"]> = {}): Session {
  return {
    user: {
      id: "user-1",
      email: "berater@example.com",
      role: "BERATER",
      mustChangePassword: false,
      formPreference: "WIZARD",
      organizationId: "greenscout",
      ...overrides,
    },
    expires: "2099-01-01T00:00:00.000Z",
  };
}

describe("canAccessStudy", () => {
  it("returns false when the session is null (unauthenticated)", () => {
    expect(canAccessStudy(null, { consultantId: "user-1" })).toBe(false);
  });

  it("returns false when the session.user is missing", () => {
    // Sanity-check the inner branch — Auth.js sometimes hydrates Session
    // without a user (e.g. during sign-out). The narrowing must hold.
    const broken = { user: undefined, expires: "2099-01-01T00:00:00.000Z" } as unknown as Session;
    expect(canAccessStudy(broken, { consultantId: "user-1" })).toBe(false);
  });

  it("returns true for an ADMIN viewing another consultant's study (F7)", () => {
    const session = makeSession({ id: "admin-1", role: "ADMIN" });
    expect(canAccessStudy(session, { consultantId: "user-2" })).toBe(true);
  });

  it("returns true for a BERATER viewing their own study", () => {
    const session = makeSession({ id: "user-1", role: "BERATER" });
    expect(canAccessStudy(session, { consultantId: "user-1" })).toBe(true);
  });

  it("returns false for a BERATER viewing another consultant's study", () => {
    const session = makeSession({ id: "user-1", role: "BERATER" });
    expect(canAccessStudy(session, { consultantId: "user-2" })).toBe(false);
  });
});
