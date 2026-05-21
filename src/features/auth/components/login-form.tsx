"use client";

/**
 * T-018 Login form (client component).
 *
 * Binding contract: DECISIONS.md → "T-018 Login page design (user-confirmed, binding)".
 *
 * Soft-distinguished UX:
 *   - generic "Email oder Passwort falsch" Alert on `invalid-credentials`
 *   - countdown lockout Alert (with <Lock> icon + title) only on `locked`
 *     (T-017a `LockedAccountError` path — fires only when the supplied
 *     password is correct but the account is in its lockout window).
 *   - "Konto deaktiviert" Alert on `inactive` / `deleted` (password correct +
 *     account admin-disabled or soft-deleted).
 *   - Lockout banner takes precedence — generic + lockout never co-render.
 *
 * NO PasswordRuleChecklist on this screen — login verifies an existing
 * password, it doesn't compose a new one. The checklist belongs to T-019
 * (forced password change) per DECISIONS T-016 + the T-018 KORREKTUR.
 *
 * Countdown: client-side `setInterval(30_000)` updates the remaining-minutes
 * marker; cleared on unmount or when the lockout window expires.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { signInAction, type SignInResult } from "@/features/auth/actions/sign-in";
import { loginSchema, type LoginInput } from "@/features/auth/schemas/login-schema";
import { t } from "@/i18n/de";

interface LockoutState {
  lockoutUntilIso: string;
  remainingMinutes: number;
}

const COUNTDOWN_TICK_MS = 30_000;

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [genericError, setGenericError] = useState<string | null>(null);
  const [lockout, setLockout] = useState<LockoutState | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Lockout-banner countdown — update every 30s, auto-dismiss at 0.
  useEffect(() => {
    if (lockout === null) return;
    const interval = setInterval(() => {
      const remainingMs = new Date(lockout.lockoutUntilIso).getTime() - Date.now();
      if (remainingMs <= 0) {
        setLockout(null);
        clearInterval(interval);
        return;
      }
      const remainingMinutes = Math.ceil(remainingMs / 60_000);
      if (remainingMinutes !== lockout.remainingMinutes) {
        setLockout((prev) => (prev === null ? null : { ...prev, remainingMinutes }));
      }
    }, COUNTDOWN_TICK_MS);
    return () => clearInterval(interval);
  }, [lockout]);

  function onSubmit(values: LoginInput) {
    setGenericError(null);
    setLockout(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("email", values.email);
      formData.set("password", values.password);

      const result: SignInResult = await signInAction(formData);

      if (result.ok) {
        router.push("/");
        return;
      }

      // Map typed errorCode from T-017a's discriminated union.
      switch (result.errorCode) {
        case "locked":
          if (result.lockedUntil !== undefined) {
            const remainingMs = new Date(result.lockedUntil).getTime() - Date.now();
            setLockout({
              lockoutUntilIso: result.lockedUntil,
              remainingMinutes: Math.max(1, Math.ceil(remainingMs / 60_000)),
            });
          } else {
            // Defensive: lockedUntil missing → fall back to generic error.
            setGenericError(t("auth.error.invalid-credentials"));
          }
          break;
        case "inactive":
        case "deleted":
          setGenericError(t("auth.error.inactive"));
          break;
        case "server":
          setGenericError(t("auth.error.server"));
          break;
        case "invalid-credentials":
        default:
          setGenericError(t("auth.error.invalid-credentials"));
          break;
      }
    });
  }

  const lockoutMessage =
    lockout !== null
      ? t("auth.error.locked-out").replace("{minutes}", String(lockout.remainingMinutes))
      : null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {lockoutMessage !== null && (
          <Alert variant="destructive">
            <Lock className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>{t("auth.error.lockout-banner-title")}</AlertTitle>
            <AlertDescription>{lockoutMessage}</AlertDescription>
          </Alert>
        )}
        {genericError !== null && lockoutMessage === null && (
          <Alert variant="destructive">
            <AlertDescription>{genericError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.field.email")}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" required {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.field.password")}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" required {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full bg-plant-green text-white hover:bg-plant-green/90"
          disabled={isPending}
        >
          {isPending ? t("auth.action.signing-in") : t("auth.action.sign-in")}
        </Button>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t("auth.page.login.forgot-password-hint")}
        </p>
      </form>
    </Form>
  );
}
