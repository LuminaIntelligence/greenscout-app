/**
 * T-025 wizard Step 1 — Kunde.
 *
 * Single field: `customerId` referencing an existing `Customer` row.
 * The wizard's customer-selector populates this from the existing
 * `/api/customers` endpoint (T-022). cuid is the Prisma id format
 * (default `@default(cuid())`); the schema accepts any non-empty
 * string, leaving the FK-existence check to the database.
 *
 * @see DECISIONS.md → Wizard-Step layout (decision #5)
 */

import { z } from "zod";

import { requiredString } from "./common";

export const step1KundeSchema = z.object({
  customerId: requiredString("studies.error.customer-required"),
});

export type Step1KundeInput = z.infer<typeof step1KundeSchema>;
