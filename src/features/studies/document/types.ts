/**
 * §7.10-Pivot PR 2 — `StudyDocumentData` bundle consumed by every
 * React-Slide-Komponente unter `src/features/studies/document/slides/`.
 *
 * The bundle is assembled by `buildStudyDocumentData(studyId)` in
 * `./services/build-document-data.ts`. PR 3 (Playwright-PDF-Endpoint)
 * and PR 4 (HMAC-gated Public-Route) consume the same bundle so the
 * data-source shape stays stable across renders.
 *
 * The Prisma row types (`Customer`, `Study`, `User`) come straight from
 * `@/generated/prisma`. `DerivedValues` comes from the TS calculation
 * mirror in `src/lib/calculations/types.ts`. Images carry the
 * `/api/uploads/<id>` URLs the existing T-029a route serves; null means
 * the slot is empty and the slide renders a Brand-Lime-Outline
 * placeholder.
 */

// Type-only Prisma imports. This file is added to the trusted-path
// override in `eslint.config.mjs` (alongside `src/features/auth/types.ts`)
// because the slide components need the canonical Prisma row shapes
// (`Customer`, `Study`, `User`) for their props — no runtime Prisma
// access happens here.
import type { Customer, Study, User } from "@/generated/prisma";

import type { DerivedValues } from "@/lib/calculations/types";

/**
 * Resolved image URLs for a study. The widget under T-029a uploads via
 * `<StudyImage>`-rows; the consumer-facing URL is `/api/uploads/<id>`.
 * `null` means the user has not uploaded that slot.
 */
export interface StudyDocumentImages {
  beforeUrl: string | null;
  afterUrl: string | null;
}

/**
 * Complete study-document-rendering bundle. Every slide component
 * accepts this exact type as its sole prop.
 */
export interface StudyDocumentData {
  customer: Customer;
  study: Study;
  consultant: User;
  derived: DerivedValues;
  images: StudyDocumentImages;
}
