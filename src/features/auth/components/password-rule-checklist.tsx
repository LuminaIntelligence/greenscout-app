"use client";

/**
 * T-019 PasswordRuleChecklist (client component).
 *
 * Three-state live checklist for password composition, reusable across
 * T-019 forced password change, T-041b admin password reset, and any
 * future signup flow.
 *
 * Visual contract — DECISIONS.md → "T-019 Forced password change design
 * (user-confirmed, binding)" → "Three-state PasswordRuleChecklist":
 *
 *   | State        | Trigger                       | Icon     | Icon color           | Label color          |
 *   |--------------|-------------------------------|----------|----------------------|----------------------|
 *   | Neutral      | hasTyped === false (initial)  | <Circle> | text-muted-foreground| text-muted-foreground|
 *   | Passed       | hasTyped && rule.test(value)  | <Check>  | text-plant-green     | text-foreground      |
 *   | Not-passed   | hasTyped && !rule.test(value) | <X>      | text-destructive     | text-destructive     |
 *
 * `hasTyped` is sticky: once true (first keystroke on newPassword), it
 * stays true. Empty newPassword AFTER typing is therefore not-passed
 * (correct: empty newPassword is invalid).
 *
 * a11y:
 *   - container has `role="list"` + `aria-live="polite"` + a German
 *     aria-label resolved from `auth.checklist.aria-label`.
 *   - each item announces its state (`erfüllt` / `nicht erfüllt` /
 *     `noch nicht geprüft`) via a `<span class="sr-only">`. Screen
 *     readers re-announce per state change because the live region is
 *     polite.
 *
 * SPEC §4.1 mandate "green/red **as the user types**" — neutral is the
 * pre-typing initial state, NOT a violation: the rules turn green/red
 * the moment the user starts typing.
 */

import { Check, Circle, X } from "lucide-react";

import { passwordRules, type PasswordRuleKey } from "@/features/auth/password-policy";
import { t, type TranslationKey } from "@/i18n/de";

interface PasswordRuleChecklistProps {
  /** Current new-password input value. */
  value: string;
  /**
   * Whether the user has typed at least one character into the
   * new-password field. Sticky boolean — owners must set it once and
   * never flip back to false until the form is reset/unmounted.
   */
  hasTyped: boolean;
  /** Optional className override for the container. */
  className?: string;
}

function ruleKeyToTranslationKey(key: PasswordRuleKey): TranslationKey {
  // Five rule keys map 1:1 to five `auth.password.rule.<key>` translation
  // keys. The cast is safe because PasswordRuleKey is a closed union and
  // the `auth.password.rule.<key>` shape exists for every member.
  return `auth.password.rule.${key}` as TranslationKey;
}

export function PasswordRuleChecklist({ value, hasTyped, className }: PasswordRuleChecklistProps) {
  const containerClass = [
    "mt-2 space-y-1 rounded-md border border-border bg-muted/30 p-3 text-sm",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <ul
      role="list"
      aria-live="polite"
      aria-label={t("auth.checklist.aria-label")}
      className={containerClass}
    >
      {passwordRules.map((rule) => {
        const passed = rule.test(value);

        const Icon = !hasTyped ? Circle : passed ? Check : X;
        const iconColor = !hasTyped
          ? "text-muted-foreground"
          : passed
            ? "text-plant-green"
            : "text-destructive";
        const labelColor = !hasTyped
          ? "text-muted-foreground"
          : passed
            ? "text-foreground"
            : "text-destructive";
        const srState = !hasTyped
          ? t("auth.checklist.neutral")
          : passed
            ? t("auth.checklist.fulfilled")
            : t("auth.checklist.unfulfilled");

        return (
          <li key={rule.key} className="flex items-center gap-2">
            <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} aria-hidden="true" />
            <span className={labelColor}>{t(ruleKeyToTranslationKey(rule.key))}</span>
            <span className="sr-only"> {srState}</span>
          </li>
        );
      })}
    </ul>
  );
}
