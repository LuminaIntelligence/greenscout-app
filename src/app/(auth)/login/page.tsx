import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";
import { t } from "@/i18n/de";

/**
 * T-018 `/login` page (Server Component).
 *
 * Renders the shadcn Card shell with the German title + subtitle, then
 * delegates the interactive form to the `LoginForm` client component.
 *
 * Visual contract: DECISIONS.md → "T-018 Login page design (user-confirmed,
 * binding)" — final design summary table is authoritative.
 */
export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl text-forest-green">
          {t("auth.page.login.title")}
        </CardTitle>
        <CardDescription>{t("auth.page.login.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
