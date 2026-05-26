import { describe, expect, it } from "vitest";

import { step1KundeSchema } from "./step1-kunde";

describe("step1KundeSchema", () => {
  it("accepts a non-empty customerId", () => {
    const result = step1KundeSchema.safeParse({ customerId: "cust-1" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty customerId", () => {
    const result = step1KundeSchema.safeParse({ customerId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("studies.error.customer-required");
    }
  });

  it("rejects a missing customerId", () => {
    const result = step1KundeSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
