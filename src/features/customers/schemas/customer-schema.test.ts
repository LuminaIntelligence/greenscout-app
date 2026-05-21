/**
 * T-023 customer-schema tests.
 *
 * Mirrors `login-schema.test.ts` / `change-password-schema.test.ts` —
 * verifies every required-field rejection and every optional-field
 * empty-string normalisation, plus the email validation pipeline.
 */

import { describe, expect, it } from "vitest";

import { customerSchema } from "./customer-schema";

describe("customerSchema", () => {
  describe("required fields", () => {
    it("rejects empty contactFirstName with the i18n key", () => {
      const result = customerSchema.safeParse({
        contactFirstName: "",
        contactLastName: "Berger",
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(
        result.error.issues.some(
          (issue) =>
            issue.path[0] === "contactFirstName" &&
            issue.message === "customers.error.first-name-required",
        ),
      ).toBe(true);
    });

    it("rejects whitespace-only contactFirstName (trim runs before min(1))", () => {
      const result = customerSchema.safeParse({
        contactFirstName: "   ",
        contactLastName: "Berger",
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.issues.some((issue) => issue.path[0] === "contactFirstName")).toBe(true);
    });

    it("rejects empty contactLastName with the i18n key", () => {
      const result = customerSchema.safeParse({
        contactFirstName: "Anna",
        contactLastName: "",
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(
        result.error.issues.some(
          (issue) =>
            issue.path[0] === "contactLastName" &&
            issue.message === "customers.error.last-name-required",
        ),
      ).toBe(true);
    });

    it("accepts the minimum valid shape", () => {
      const result = customerSchema.safeParse({
        contactFirstName: "Anna",
        contactLastName: "Berger",
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.contactFirstName).toBe("Anna");
      expect(result.data.contactLastName).toBe("Berger");
    });
  });

  describe("optional-string fields", () => {
    it.each([
      "companyName",
      "phone",
      "billingAddress",
      "billingZipCode",
      "billingCity",
      "notes",
    ] as const)("normalises empty %s to undefined", (field) => {
      const result = customerSchema.safeParse({
        contactFirstName: "Anna",
        contactLastName: "Berger",
        [field]: "",
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data[field]).toBeUndefined();
    });

    it("trims surrounding whitespace on optional fields", () => {
      const result = customerSchema.safeParse({
        contactFirstName: "Anna",
        contactLastName: "Berger",
        companyName: "  Hofgut Sonnenwiese GmbH  ",
        billingCity: "  Stuttgart  ",
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.companyName).toBe("Hofgut Sonnenwiese GmbH");
      expect(result.data.billingCity).toBe("Stuttgart");
    });

    it("preserves non-empty optional values", () => {
      const result = customerSchema.safeParse({
        contactFirstName: "Anna",
        contactLastName: "Berger",
        companyName: "Hofgut Sonnenwiese GmbH",
        phone: "+49 711 1234567",
        billingAddress: "Hauptstraße 12",
        billingZipCode: "70173",
        billingCity: "Stuttgart",
        notes: "Sonnige Süd-Ost-Lage",
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.companyName).toBe("Hofgut Sonnenwiese GmbH");
      expect(result.data.phone).toBe("+49 711 1234567");
      expect(result.data.billingAddress).toBe("Hauptstraße 12");
      expect(result.data.billingZipCode).toBe("70173");
      expect(result.data.billingCity).toBe("Stuttgart");
      expect(result.data.notes).toBe("Sonnige Süd-Ost-Lage");
    });
  });

  describe("email field", () => {
    it("treats empty string as absent (success, undefined)", () => {
      const result = customerSchema.safeParse({
        contactFirstName: "Anna",
        contactLastName: "Berger",
        email: "",
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.email).toBeUndefined();
    });

    it("treats missing field as absent (success, undefined)", () => {
      const result = customerSchema.safeParse({
        contactFirstName: "Anna",
        contactLastName: "Berger",
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.email).toBeUndefined();
    });

    it("accepts a syntactically valid email", () => {
      const result = customerSchema.safeParse({
        contactFirstName: "Anna",
        contactLastName: "Berger",
        email: "anna@hofgut-sonnenwiese.de",
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.email).toBe("anna@hofgut-sonnenwiese.de");
    });

    it.each([
      "not-an-email",
      "missing-at.de",
      "@nodomain.de",
      "double@@at.de",
      "spaces in@between.de",
    ])("rejects '%s' with the i18n key", (badEmail) => {
      const result = customerSchema.safeParse({
        contactFirstName: "Anna",
        contactLastName: "Berger",
        email: badEmail,
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(
        result.error.issues.some(
          (issue) => issue.path[0] === "email" && issue.message === "customers.error.invalid-email",
        ),
      ).toBe(true);
    });
  });
});
