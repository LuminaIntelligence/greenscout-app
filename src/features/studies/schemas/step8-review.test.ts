import { describe, expect, it } from "vitest";

import { studyFullSchema } from "./step8-review";

describe("step8-review re-exports", () => {
  it("re-exports studyFullSchema as the canonical Step 8 surface", () => {
    expect(typeof studyFullSchema.safeParse).toBe("function");
  });
});
