import { describe, expect, it } from "vitest";

import { changePasswordSchema } from "./change-password-schema";

describe("changePasswordSchema", () => {
  it("accepts a fully-filled, matching-confirmation payload", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "anyValueIsFine",
      newPassword: "Abc12345!",
      confirmNewPassword: "Abc12345!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty currentPassword with the wrong-current-password i18n key", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "Abc12345!",
      confirmNewPassword: "Abc12345!",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "currentPassword");
      expect(issue?.message).toBe("auth.error.wrong-current-password");
    }
  });

  it("rejects an empty newPassword with the rules-not-satisfied i18n key", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "anything",
      newPassword: "",
      confirmNewPassword: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "newPassword");
      expect(issue?.message).toBe("auth.error.rules-not-satisfied");
    }
  });

  it("rejects mismatched confirmation with the passwords-mismatch i18n key (path on confirmNewPassword)", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "anything",
      newPassword: "Abc12345!",
      confirmNewPassword: "Xyz98765@",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "confirmNewPassword");
      expect(issue?.message).toBe("auth.error.passwords-mismatch");
    }
  });

  it("does not leak rule-specifics (zod schema only checks min(1) + match — full rules are server-side)", () => {
    // A short password that violates SPEC §4.1 rules still passes the
    // schema; the change-password.ts service path runs validatePassword
    // afterwards and returns errorCode "rules-not-satisfied".
    const result = changePasswordSchema.safeParse({
      currentPassword: "a",
      newPassword: "b",
      confirmNewPassword: "b",
    });
    expect(result.success).toBe(true);
  });
});
