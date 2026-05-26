import { notFound, redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { UserForm } from "@/features/users/components/user-form";
import { t } from "@/i18n/de";
import { auth } from "@/lib/auth";
import { findUserById } from "@/lib/repositories/user.repository";

/**
 * T-041a `/users/[id]/edit` admin-only user edit page.
 */

export const metadata = { title: "Nutzer bearbeiten — GreenScout" };

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    notFound();
  }

  const { id } = await params;
  const user = await findUserById(session.user.organizationId, id);
  if (user === null) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-forest-green">{t("users.page.edit.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user.firstName} {user.lastName}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <UserForm
            mode="edit"
            userId={user.id}
            initialData={{
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
