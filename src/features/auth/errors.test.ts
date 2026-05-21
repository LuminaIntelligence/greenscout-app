import { CredentialsSignin } from "@auth/core/errors";
import { describe, expect, it } from "vitest";

import { AccountUnavailableError, LockedAccountError } from "./errors";

describe("LockedAccountError", () => {
  it("inherits from CredentialsSignin and carries the lockout timestamp", () => {
    const until = new Date(Date.now() + 15 * 60 * 1000);
    const err = new LockedAccountError(until);
    expect(err).toBeInstanceOf(CredentialsSignin);
    expect(err.code).toBe("locked");
    expect(err.lockedUntil).toBe(until);
  });
});

describe("AccountUnavailableError", () => {
  it("carries the 'deleted' code when constructed with 'deleted'", () => {
    const err = new AccountUnavailableError("deleted");
    expect(err).toBeInstanceOf(CredentialsSignin);
    expect(err.code).toBe("deleted");
  });

  it("carries the 'inactive' code when constructed with 'inactive'", () => {
    const err = new AccountUnavailableError("inactive");
    expect(err).toBeInstanceOf(CredentialsSignin);
    expect(err.code).toBe("inactive");
  });
});
