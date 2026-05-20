import { describe, it, expect } from "vitest";

import { normaliseEmail } from "./normalise-email";

describe("normaliseEmail", () => {
  it("lowercases mixed-case input", () => {
    expect(normaliseEmail("Foo@Bar.Com")).toBe("foo@bar.com");
  });

  it("trims surrounding whitespace", () => {
    expect(normaliseEmail("  foo@bar.com  ")).toBe("foo@bar.com");
  });

  it("combines trim and lowercase", () => {
    expect(normaliseEmail("\t  FOO@BAR.COM \n")).toBe("foo@bar.com");
  });

  it("returns empty string unchanged", () => {
    expect(normaliseEmail("")).toBe("");
  });
});
