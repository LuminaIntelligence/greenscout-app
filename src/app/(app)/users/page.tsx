import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { UsersTable, type UserRow } from "@/features/users/components/users-table";
import { t } from "@/i18n/de";
import { auth } from "@/lib/auth";
import { listUsers } from "@/lib/repositories/user.repository";

/**
 * T-041a `/users` admin user list page.
 *
 * Server Component — admin-only. Non-admin callers receive a 404 (we
 * deliberately avoid 403 here to make the admin surface invisible to
 * non-admin users; the topbar already hides the nav link for them).
 *
 * The repository load is capped at 200 rows; the dashboard is
 * expected to stay well below that for MVP (~10 users per org). When
 * the org grows past that ceiling, promote to server-side pagination
 * via the customer-table pattern.
 */

export const metadata = { title: "Nutzer — GreenScout" };

export const dynamic = "force-dynamic";

export default async function UsersListPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    notFound();
  }

  const rows = await listUsers(session.user.organizationId, { take: 200 });
  const initialData: UserRow[] = rows.map((u) => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    active: u.active,
    createdAt: u.createdAt.toISOString(),
    isSelf: u.id === session.user.id,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl text-forest-green">{t("users.page.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("users.page.subtitle")}</p>
        </div>
        <Button asChild>
          <Link href="/users/new">{t("users.action.new")}</Link>
        </Button>
      </div>

      <UsersTable initialData={initialData} />
    </div>
  );
}
