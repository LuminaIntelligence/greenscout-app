import { notFound, redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { NewUserClient } from "@/features/users/components/new-user-client";
import { t } from "@/i18n/de";
import { auth } from "@/lib/auth";

/**
 * T-041a `/users/new` admin-only "create user" page.
 *
 * Server Component — runs the auth + admin-role gate, then hands off
 * to `NewUserClient` which owns the form + temp-password-dialog
 * state. The dialog must live in a Client Component because it holds
 * the plaintext temp password in React state.
 *
 * The Server Action `createUserAction` does its own admin-role check
 * — the gate below is a UX guard, not the security boundary.
 */

export const metadata = { title: "Neuen Nutzer anlegen — GreenScout" };

export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-forest-green">{t("users.page.new.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("users.page.new.subtitle")}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <NewUserClient />
        </CardContent>
      </Card>
    </div>
  );
}
