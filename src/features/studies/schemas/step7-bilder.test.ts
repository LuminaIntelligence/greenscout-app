import { describe, expect, it } from "vitest";

import { step7BilderSchema } from "./step7-bilder";

describe("step7BilderSchema", () => {
  it("accepts an empty payload (placeholder until T-029a)", () => {
    expect(step7BilderSchema.safeParse({}).success).toBe(true);
  });

  it("accepts populated bildBeforeId/bildAfterId", () => {
    expect(
      step7BilderSchema.safeParse({
        bildBeforeId: "img-before-1",
        bildAfterId: "img-after-1",
      }).success,
    ).toBe(true);
  });
});
