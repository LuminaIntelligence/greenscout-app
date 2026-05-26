import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/i18n/de";
import { listDocumentsForStudy } from "@/lib/repositories/generated-document.repository";

/**
 * T-040 per-study versions panel.
 *
 * Lists every `GeneratedDocument` row for the study, newest first.
 * Each row renders a download link to the protected
 * `/api/studies/[id]/documents/[docId]` route handler. The list is a
 * Server Component — no client-side fetching needed.
 *
 * Version numbers are derived from row order (newest = highest). The
 * pair of PPTX + PDF that ship together share the same version number
 * for readability (Berater + Kunde call them "Version 1", "Version 2").
 */

interface Props {
  studyId: string;
}

export async function StudyDocumentList({ studyId }: Props) {
  const documents = await listDocumentsForStudy(studyId, { take: 200 });

  // Pair PPTX + PDF generations by timestamp. Same generatedAt -> same
  // version. listDocumentsForStudy returns desc by generatedAt; we
  // derive a stable Version-N where the newest *pair* is N.
  const versionByTimestamp = new Map<string, number>();
  let nextVersion = 1;
  // Walk oldest-first so version 1 is the first ever generation.
  for (const doc of [...documents].reverse()) {
    const key = doc.generatedAt.toISOString();
    if (!versionByTimestamp.has(key)) {
      versionByTimestamp.set(key, nextVersion);
      nextVersion += 1;
    }
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          {t("studies.document.list.empty")}
        </CardContent>
      </Card>
    );
  }

  const dateFormatter = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t("studies.document.list.column.version")}</th>
              <th className="px-4 py-3 font-medium">{t("studies.document.list.column.format")}</th>
              <th className="px-4 py-3 font-medium">
                {t("studies.document.list.column.created-at")}
              </th>
              <th className="px-4 py-3 text-right font-medium">
                {t("studies.document.list.column.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {documents.map((doc) => {
              const version = versionByTimestamp.get(doc.generatedAt.toISOString()) ?? 1;
              return (
                <tr key={doc.id}>
                  <td className="px-4 py-3 font-medium">{version}</td>
                  <td className="px-4 py-3">{doc.format}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {dateFormatter.format(new Date(doc.generatedAt))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild size="sm" variant="outline">
                      <a href={`/api/studies/${studyId}/documents/${doc.id}`} download>
                        {t("studies.document.list.action.download")}
                      </a>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
