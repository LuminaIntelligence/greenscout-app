import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./hash-password";

describe("hashPassword", () => {
  it("produces a PHC-string-format argon2id hash", async () => {
    const result = await hashPassword("correct-horse-battery-staple");
    expect(result).toMatch(/^\$argon2id\$v=19\$m=\d+,t=\d+,p=\d+\$/);
  });

  it("rejects empty plaintext", async () => {
    await expect(hashPassword("")).rejects.toThrow(/empty/);
  });
});

describe("verifyPassword", () => {
  it("returns true on matching plaintext", async () => {
    const result = await hashPassword("correct-horse-battery-staple");
    await expect(verifyPassword(result, "correct-horse-battery-staple")).resolves.toBe(true);
  });

  it("returns false on mismatched plaintext", async () => {
    const result = await hashPassword("correct-horse-battery-staple");
    await expect(verifyPassword(result, "wrong-password")).resolves.toBe(false);
  });

  it("returns false on empty inputs", async () => {
    await expect(verifyPassword("", "anything")).resolves.toBe(false);
    await expect(verifyPassword("some-hash", "")).resolves.toBe(false);
  });
});
