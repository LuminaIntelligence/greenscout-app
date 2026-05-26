import { describe, expect, it } from "vitest";

import { step6TermineSchema } from "./step6-termine";

describe("step6TermineSchema", () => {
  it("accepts two distinct dates", () => {
    const result = step6TermineSchema.safeParse({
      terminVorschlag1: new Date("2026-06-01T10:00:00"),
      terminVorschlag2: new Date("2026-06-02T10:00:00"),
    });
    expect(result.success).toBe(true);
  });

  it("accepts ISO-string input", () => {
    const result = step6TermineSchema.safeParse({
      terminVorschlag1: "2026-06-01T10:00:00",
      terminVorschlag2: "2026-06-02T10:00:00",
    });
    expect(result.success).toBe(true);
  });

  it("rejects identical dates", () => {
    const result = step6TermineSchema.safeParse({
      terminVorschlag1: new Date("2026-06-01T10:00:00"),
      terminVorschlag2: new Date("2026-06-01T10:00:00"),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("studies.error.termine-must-differ");
    }
  });

  it("rejects empty terminVorschlag1", () => {
    const result = step6TermineSchema.safeParse({
      terminVorschlag1: "",
      terminVorschlag2: "2026-06-02T10:00:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("studies.error.termin-required");
    }
  });

  it("rejects invalid date strings", () => {
    const result = step6TermineSchema.safeParse({
      terminVorschlag1: "not-a-date",
      terminVorschlag2: "2026-06-02T10:00:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("studies.error.termin-invalid");
    }
  });

  it("rejects empty terminVorschlag2", () => {
    const result = step6TermineSchema.safeParse({
      terminVorschlag1: "2026-06-02T10:00:00",
      terminVorschlag2: "",
    });
    expect(result.success).toBe(false);
  });
});
