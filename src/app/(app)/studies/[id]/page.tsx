import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { canAccessStudy } from "@/features/auth/utils/can-access-study";
import { GenerateDocumentButton } from "@/features/studies/components/generate-document-button";
import { HandoverDialog } from "@/features/studies/components/handover-dialog";
import { StudyDeleteDialog } from "@/features/studies/components/study-delete-dialog";
import { StudyDocumentList } from "@/features/studies/components/study-document-list";
import { t, type TranslationKey } from "@/i18n/de";
import { auth } from "@/lib/auth";
import { findStudyById } from "@/lib/repositories/study.repository";
import { listUsers } from "@/lib/repositories/user.repository";

/**
 * T-028 `/studies/[id]` read-only detail page.
 */

export const metadata = {
  title: "Studiendetails — GreenScout",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function statusKey(status: "DRAFT" | "READY" | "GENERATED"): TranslationKey {
  if (status === "DRAFT") return "studies.status.draft";
  if (status === "READY") return "studies.status.ready";
  return "studies.status.generated";
}

export default async function StudyDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const study = await findStudyById(session.user.organizationId, id);
  if (study === null) {
    notFound();
  }
  if (!canAccessStudy(session, study)) {
    notFound();
  }

  // T-030 — load the org's active berater + admin pool for the
  // handover dropdown. The dialog filters out the current owner
  // client-side; we expose only the columns the dialog needs.
  const consultants = await listUsers(session.user.organizationId, {
    active: true,
    take: 200,
  });
  const consultantOptions = consultants.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.role,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-forest-green">
          {study.objectName || t("studies.review.summary-empty")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("studies.page.detail.title")} · {t(statusKey(study.status))}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6 text-sm">
          <DetailRow label={t("studies.field.object-name")} value={study.objectName} />
          <DetailRow label={t("studies.field.object-address")} value={study.objectAddress} />
          <DetailRow
            label={t("studies.field.object-zip") + " / " + t("studies.field.object-city")}
            value={`${study.objectZipCode} ${study.objectCity}`.trim()}
          />
          <DetailRow label={t("studies.field.flurstueck")} value={study.flurstueck} />
          <Separator />
          <DetailRow label={t("studies.field.anlage-kwp")} value={String(study.anlageKwp)} />
          <DetailRow
            label={t("studies.field.pv-erzeugung")}
            value={String(study.pvErzeugungKwhJahr)}
          />
          <DetailRow
            label={t("studies.field.pv-eigenverbrauch")}
            value={String(study.pvEigenverbrauchKwhJahr)}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline">
          <Link href={`/studies/${study.id}/edit`}>{t("studies.action.edit")}</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <HandoverDialog
            studyId={study.id}
            studyObjectLabel={study.objectName || study.id}
            currentConsultantId={study.consultantId}
            consultants={consultantOptions}
          />
          <StudyDeleteDialog studyId={study.id} studyObjectLabel={study.objectName || study.id} />
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-2xl text-forest-green">
              {t("studies.document.section-title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("studies.document.section-subtitle")}
            </p>
          </div>
          <GenerateDocumentButton studyId={study.id} disabled={study.status === "DRAFT"} />
        </div>
        <StudyDocumentList studyId={study.id} />
      </section>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[200px_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">
        {value && value.length > 0 ? value : t("studies.review.summary-empty")}
      </dd>
    </div>
  );
}
