import { notFound, redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { StudyForm, type StudyFormValues } from "@/features/studies/components/study-form";
import { t } from "@/i18n/de";
import { auth } from "@/lib/auth";
import { findStudyById } from "@/lib/repositories/study.repository";
import { listStudyImages } from "@/lib/repositories/study-image.repository";
import { findUserById } from "@/lib/repositories/user.repository";

/**
 * T-026 / T-027 study edit page.
 *
 * Server Component — auth-gates, loads the persisted study, looks
 * up the current user's `formPreference` and renders either the
 * wizard or the single-page form. Berater see only own studies;
 * admin sees all.
 */

export const metadata = { title: "Studie bearbeiten — GreenScout" };

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function asNumberInput(value: unknown): number | "" {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value;
  const n = Number(String(value));
  return Number.isFinite(n) ? n : "";
}

function asDateInput(value: Date | null): string {
  if (value === null) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export default async function StudyEditPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const study = await findStudyById(session.user.organizationId, id);
  if (study === null) {
    notFound();
  }
  if (session.user.role !== "ADMIN" && study.consultantId !== session.user.id) {
    notFound();
  }

  // Look up the consultant's form preference to pick wizard vs
  // single-page mode. Default WIZARD if the lookup fails.
  const consultant = await findUserById(session.user.organizationId, session.user.id);
  const mode: "wizard" | "single-page" =
    consultant?.formPreference === "SINGLE_PAGE" ? "single-page" : "wizard";

  // T-029a — hydrate Step-7 image previews from the StudyImage table.
  const images = await listStudyImages(study.id);
  const before = images.find((i) => i.type === "BEFORE") ?? null;
  const after = images.find((i) => i.type === "AFTER") ?? null;

  const initialValues: StudyFormValues = {
    customerId: study.customerId,
    objectName: study.objectName,
    objectAddress: study.objectAddress,
    objectZipCode: study.objectZipCode,
    objectCity: study.objectCity,
    flurstueck: study.flurstueck,
    anlageKwp: asNumberInput(study.anlageKwp),
    pvErzeugungKwhJahr: asNumberInput(study.pvErzeugungKwhJahr),
    pvEigenverbrauchKwhJahr: asNumberInput(study.pvEigenverbrauchKwhJahr),
    pvVerkaufEurKwh: asNumberInput(study.pvVerkaufEurKwh),
    verbrauchKwhJahr: asNumberInput(study.verbrauchKwhJahr),
    versorgerPreisEurKwh: asNumberInput(study.versorgerPreisEurKwh),
    pachtEurProKwp: asNumberInput(study.pachtEurProKwp),
    vertragslaufzeitJahre: asNumberInput(study.vertragslaufzeitJahre),
    modulAnzahl: asNumberInput(study.modulAnzahl),
    modulFlaecheM2: asNumberInput(study.modulFlaecheM2),
    eigenverbrauchsquoteProzent: asNumberInput(study.eigenverbrauchsquoteProzent),
    netzeinspeisungKwhJahr: asNumberInput(study.netzeinspeisungKwhJahr),
    szenarioPreis1: asNumberInput(study.szenarioPreis1),
    szenarioPreis2: asNumberInput(study.szenarioPreis2),
    szenarioPreis3: asNumberInput(study.szenarioPreis3),
    terminVorschlag1: asDateInput(study.terminVorschlag1),
    terminVorschlag2: asDateInput(study.terminVorschlag2),
    bildBefore:
      before === null
        ? null
        : {
            id: before.id,
            kind: "BEFORE",
            url: `/api/uploads/${before.id}`,
            widthPx: before.widthPx,
            heightPx: before.heightPx,
            mimeType: before.mimeType,
          },
    bildAfter:
      after === null
        ? null
        : {
            id: after.id,
            kind: "AFTER",
            url: `/api/uploads/${after.id}`,
            widthPx: after.widthPx,
            heightPx: after.heightPx,
            mimeType: after.mimeType,
          },
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-forest-green">{t("studies.page.edit.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {study.objectName || t("studies.review.summary-empty")}
        </p>
      </div>
      {mode === "wizard" ? (
        <Card>
          <CardContent className="pt-6">
            <StudyForm mode="wizard" studyId={study.id} initialValues={initialValues} />
          </CardContent>
        </Card>
      ) : (
        <StudyForm mode="single-page" studyId={study.id} initialValues={initialValues} />
      )}
    </div>
  );
}
