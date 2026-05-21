"use client";

/**
 * T-019 change-password form (client component).
 *
 * Three password fields (current / new / confirm) + a live 3-state
 * PasswordRuleChecklist below the new-password field. Submits through
 * the `changePasswordAction` Server Action and maps the discriminated
 * `ChangePasswordResult` to a soft-distinguished error UX:
 *
 *   - `locked` (+ lockedUntil) → countdown Alert with <Lock> icon + title
 *   - `wrong-current-password` → generic destructive Alert
 *   - `same-as-current`        → generic destructive Alert
 *   - `rules-not-satisfied`    → generic destructive Alert
 *   - `server`                 → generic destructive Alert (fallback)
 *
 * Lockout-banner takes precedence — generic + lockout never co-render.
 *
 * `hasTyped` is a sticky boolean: once `newPassword.length > 0` ever
 * holds, it flips true and never reverts. PasswordRuleChecklist uses
 * it to switch from neutral (Circle/muted) to passed/not-passed
 * (Check/X + plant-green/destructive).
 *
 * On success → `router.push("/")`. The Server Action runs
 * `unstable_update({})` before returning, so the middleware reads a
 * fresh JWT and routes to the dashboard instead of bouncing back.
 *
 * @see DECISIONS.md → "T-019 Forced password change design (user-confirmed, binding)"
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

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
import { changePasswordAction } from "@/features/auth/actions/change-password";
import { PasswordRuleChecklist } from "@/features/auth/components/password-rule-checklist";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/features/auth/schemas/change-password-schema";
import { t } from "@/i18n/de";

interface LockoutState {
  lockoutUntilIso: string;
  remainingMinutes: number;
}

const COUNTDOWN_TICK_MS = 30_000;

export function ChangePasswordForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [genericError, setGenericError] = useState<string | null>(null);
  const [lockout, setLockout] = useState<LockoutState | null>(null);
  // Sticky boolean — flipped by the newPassword input's onChange wrapper
  // (see render below) the first time the field receives a non-empty
  // value. Never reverts within the component instance lifetime.
  const [hasTyped, setHasTyped] = useState(false);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  // `useWatch` is the memoizable subscription API; `form.watch()` would
  // trip the react-hooks/incompatible-library lint rule and force a
  // disable directive. See react-hook-form docs.
  const newPasswordValue = useWatch({ control: form.control, name: "newPassword" }) ?? "";

  // Lockout-banner countdown — same shape as T-018 LoginForm.
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

  function onSubmit(values: ChangePasswordInput) {
    setGenericError(null);
    setLockout(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("currentPassword", values.currentPassword);
      formData.set("newPassword", values.newPassword);
      formData.set("confirmNewPassword", values.confirmNewPassword);

      const result = await changePasswordAction(formData);

      if (result.ok) {
        router.push("/");
        return;
      }

      switch (result.errorCode) {
        case "locked":
          if (result.lockedUntil !== undefined) {
            const remainingMs = new Date(result.lockedUntil).getTime() - Date.now();
            setLockout({
              lockoutUntilIso: result.lockedUntil,
              remainingMinutes: Math.max(1, Math.ceil(remainingMs / 60_000)),
            });
          } else {
            setGenericError(t("auth.error.server"));
          }
          break;
        case "wrong-current-password":
          setGenericError(t("auth.error.wrong-current-password"));
          break;
        case "same-as-current":
          setGenericError(t("auth.error.same-as-current"));
          break;
        case "rules-not-satisfied":
          setGenericError(t("auth.error.rules-not-satisfied"));
          break;
        case "server":
        default:
          setGenericError(t("auth.error.server"));
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
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.field.current-password")}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" required {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.field.new-password")}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  required
                  {...field}
                  onChange={(event) => {
                    // Sticky flip — first keystroke that produces a
                    // non-empty value sets hasTyped true forever.
                    if (!hasTyped && event.target.value.length > 0) {
                      setHasTyped(true);
                    }
                    field.onChange(event);
                  }}
                />
              </FormControl>
              <FormMessage />
              <PasswordRuleChecklist value={newPasswordValue} hasTyped={hasTyped} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmNewPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.field.confirm-new-password")}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" required {...field} />
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
          {isPending ? t("auth.action.changing-password") : t("auth.action.change-password")}
        </Button>
      </form>
    </Form>
  );
}
