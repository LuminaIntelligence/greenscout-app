/**
 * §7.10-Pivot PR 2 — Mock `StudyDocumentData` used by
 *   - Vitest smoke-tests for every slide component, and
 *   - the dev-only `/dev/slides` preview route.
 *
 * Plain JS objects shaped to match the Prisma row types (`Customer`,
 * `Study`, `User`) — we don't import the Prisma types here to keep
 * test imports light. Field values mirror the original PPTX template's
 * "Linzgau Center" example so the rendered output matches the
 * `docs/reference/Machbarkeitsstudie-PV-Template_v1_6.pdf` reference
 * 1:1 for visual diffing.
 */

import { composeAll } from "@/lib/calculations";

import type { StudyDocumentData } from "../types";

export function makeFixtureStudyDocumentData(
  overrides: Partial<StudyDocumentData> = {},
): StudyDocumentData {
  const customer = {
    id: "cust-linzgau",
    contactFirstName: "Sven",
    contactLastName: "Smolka",
    companyName: "Einkaufszentrum Linzgau Center GmbH",
    email: "sven@linzgau.example.de",
    phone: "+49 7552 1234567",
    billingAddress: "Bergwaldstraße 4",
    billingZipCode: "88630",
    billingCity: "Pfullendorf",
    notes: null,
    organizationId: "greenscout",
    createdAt: new Date("2026-04-01T08:00:00.000Z"),
    updatedAt: new Date("2026-04-01T08:00:00.000Z"),
    deletedAt: null,
  };

  const study = {
    id: "study-linzgau",
    consultantId: "user-berater",
    customerId: "cust-linzgau",
    status: "READY" as const,
    objectName: "Einkaufszentrum Linzgau Center",
    objectAddress: "Bergwaldstraße 4",
    objectZipCode: "88630",
    objectCity: "Pfullendorf",
    flurstueck: "78.10",
    anlageKwp: 500,
    pvErzeugungKwhJahr: 472000,
    pvEigenverbrauchKwhJahr: 164000,
    pvVerkaufEurKwh: 0.22,
    verbrauchKwhJahr: 400000,
    versorgerPreisEurKwh: 0.35,
    pachtEurProKwp: 100,
    vertragslaufzeitJahre: 20,
    modulAnzahl: 1428,
    modulFlaecheM2: 2856,
    eigenverbrauchsquoteProzent: 41,
    netzeinspeisungKwhJahr: 308000,
    szenarioPreis1: 0.35,
    szenarioPreis2: 0.4,
    szenarioPreis3: 0.45,
    terminVorschlag1: new Date("2026-03-15T14:00:00.000Z"),
    terminVorschlag2: new Date("2026-03-16T10:00:00.000Z"),
    co2Override: false,
    co2TonnenProJahr: null,
    co2HektarMischwald: null,
    co2FussballfelderProJahr: null,
    organizationId: "greenscout",
    createdAt: new Date("2026-04-01T08:00:00.000Z"),
    updatedAt: new Date("2026-04-15T08:00:00.000Z"),
    deletedAt: null,
    generatedAt: null,
  };

  const consultant = {
    id: "user-berater",
    email: "bernd@greenscout-ev.de",
    passwordHash: "hash",
    passwordChangedAt: new Date("2026-04-01T08:00:00.000Z"),
    role: "BERATER" as const,
    firstName: "Bernd",
    lastName: "Berater",
    phone: "+49 172 3794240",
    mobile: null,
    addressLine: "Utechter Str. 5, 19217 Utecht",
    signaturePhotoUrl: null,
    mustChangePassword: false,
    failedLoginCount: 0,
    lockoutUntil: null,
    formPreference: "WIZARD" as const,
    active: true,
    organizationId: "greenscout",
    createdAt: new Date("2026-04-01T08:00:00.000Z"),
    updatedAt: new Date("2026-04-01T08:00:00.000Z"),
    deletedAt: null,
  };

  const derived = composeAll({
    anlageKwp: Number(study.anlageKwp),
    pvErzeugungKwhJahr: Number(study.pvErzeugungKwhJahr),
    pvEigenverbrauchKwhJahr: Number(study.pvEigenverbrauchKwhJahr),
    pvVerkaufEurKwh: Number(study.pvVerkaufEurKwh),
    verbrauchKwhJahr: Number(study.verbrauchKwhJahr),
    versorgerPreisEurKwh: Number(study.versorgerPreisEurKwh),
    pachtEurProKwp: Number(study.pachtEurProKwp),
    vertragslaufzeitJahre: study.vertragslaufzeitJahre,
    co2Override: study.co2Override,
  });

  const base: StudyDocumentData = {
    customer: customer as unknown as StudyDocumentData["customer"],
    study: study as unknown as StudyDocumentData["study"],
    consultant: consultant as unknown as StudyDocumentData["consultant"],
    derived,
    images: {
      beforeUrl: null,
      afterUrl: null,
    },
  };

  return { ...base, ...overrides };
}
