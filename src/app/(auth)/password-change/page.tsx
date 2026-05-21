import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { t } from "@/i18n/de";

/**
 * T-019 `/password-change` page (Server Component).
 *
 * Renders the shadcn Card shell + delegates the interactive form to
 * `ChangePasswordForm`. Shares the `(auth)` route group layout with
 * `/login` (Logo block above Card, centered viewport).
 *
 * Reachable both as a forced-redirect target (middleware → when
 * `mustChangePassword=true`) and via direct navigation by a user who
 * wants to voluntarily rotate their password. The Server Action
 * distinguishes the two cases in the audit log via
 * `changeSet.initiator = "user-forced" | "user-voluntary"`.
 *
 * Visual contract — DECISIONS.md → "T-019 Forced password change design".
 */
export default function PasswordChangePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl text-forest-green">
          {t("auth.page.password-change.title")}
        </CardTitle>
        <CardDescription>{t("auth.page.password-change.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChangePasswordForm />
      </CardContent>
    </Card>
  );
}
