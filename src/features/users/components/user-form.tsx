"use client";

/**
 * T-041a UserForm — client component shared between
 * `/users/new` (mode="create") and `/users/[id]/edit` (mode="edit").
 *
 * Field contract:
 *   - create: email + firstName + lastName + role (all required)
 *   - edit:   firstName + lastName + role (email is read-only —
 *     changing it is §7.3 auth-adjacent and out of scope for Slice 5a).
 *
 * On successful create, the action returns a one-time temp password.
 * The page-level wrapper (`/users/new`) handles the temp-password
 * dialog; this form just bubbles the result via `onCreated`.
 *
 * Implementation: the mode is fixed for the life of the component
 * (the parent page renders one variant), so we render two top-level
 * branches — one per mode — each with its own typed RHF hook. Sharing
 * one RHF instance across both schemas would require an awkward union
 * type and break the strong typing on `form.setError`.
 *
 * @see DECISIONS.md → "Slice 5a (T-030 / T-041a) silent decisions per §14"
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { createUserAction } from "@/features/users/actions/create-user";
import { updateUserAction } from "@/features/users/actions/update-user";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/features/users/schemas/user-schema";
import { t, type TranslationKey } from "@/i18n/de";

export interface UserFormInitialData {
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "BERATER";
}

export type UserFormProps =
  | {
      mode: "create";
      userId?: undefined;
      initialData?: undefined;
      onCreated: (result: { userId: string; tempPassword: string }) => void;
    }
  | {
      mode: "edit";
      userId: string;
      initialData: UserFormInitialData;
      onCreated?: undefined;
    };

function isTranslationKey(key: string): key is TranslationKey {
  return key.startsWith("users.error.") || key.startsWith("auth.error.");
}

function mapErrorCode(errorCode: string): TranslationKey {
  if (errorCode === "not-found") return "users.error.not-found";
  if (errorCode === "forbidden") return "users.error.forbidden";
  if (errorCode === "email-taken") return "users.error.email-taken";
  return "users.error.server";
}

function RoleRadio({
  value,
  onChange,
}: {
  value: "ADMIN" | "BERATER";
  onChange: (next: "ADMIN" | "BERATER") => void;
}) {
  return (
    <RadioGroup value={value} onValueChange={(v) => onChange(v as "ADMIN" | "BERATER")}>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="BERATER" id="role-berater" />
        <label htmlFor="role-berater" className="text-sm">
          {t("users.role.berater")}
        </label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="ADMIN" id="role-admin" />
        <label htmlFor="role-admin" className="text-sm">
          {t("users.role.admin")}
        </label>
      </div>
    </RadioGroup>
  );
}

function CreateUserForm({
  onCreated,
}: {
  onCreated: (result: { userId: string; tempPassword: string }) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: "", firstName: "", lastName: "", role: "BERATER" },
  });

  function onSubmit(values: CreateUserInput) {
    startTransition(async () => {
      const result = await createUserAction(values);
      if (result.ok) {
        toast.success(t("users.toast.created"));
        onCreated({ userId: result.userId, tempPassword: result.tempPassword });
        return;
      }
      if (result.errorCode === "validation" && result.fieldErrors) {
        for (const [field, messageKey] of Object.entries(result.fieldErrors)) {
          const message = isTranslationKey(messageKey) ? t(messageKey) : messageKey;
          form.setError(field as keyof CreateUserInput, { type: "server", message });
        }
        return;
      }
      toast.error(t(mapErrorCode(result.errorCode)));
    });
  }

  const submitLabel = isPending ? t("users.action.creating") : t("users.action.create");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <section className="space-y-4">
          <h2 className="font-heading text-lg text-forest-green">{t("users.section.account")}</h2>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("users.field.email")}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    required
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("users.field.first-name")}</FormLabel>
                  <FormControl>
                    <Input required {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("users.field.last-name")}</FormLabel>
                  <FormControl>
                    <Input required {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="font-heading text-lg text-forest-green">{t("users.section.role")}</h2>
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>{t("users.field.role")}</FormLabel>
                <FormControl>
                  <RoleRadio value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/users")}
            disabled={isPending}
          >
            {t("users.action.cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function EditUserForm({
  userId,
  initialData,
}: {
  userId: string;
  initialData: UserFormInitialData;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      firstName: initialData.firstName,
      lastName: initialData.lastName,
      role: initialData.role,
    },
  });

  function onSubmit(values: UpdateUserInput) {
    startTransition(async () => {
      const result = await updateUserAction({ userId, data: values });
      if (result.ok) {
        toast.success(t("users.toast.updated"));
        router.refresh();
        router.push("/users");
        return;
      }
      if (result.errorCode === "validation" && result.fieldErrors) {
        for (const [field, messageKey] of Object.entries(result.fieldErrors)) {
          const message = isTranslationKey(messageKey) ? t(messageKey) : messageKey;
          form.setError(field as keyof UpdateUserInput, { type: "server", message });
        }
        return;
      }
      toast.error(t(mapErrorCode(result.errorCode)));
    });
  }

  const submitLabel = isPending ? t("users.action.saving") : t("users.action.save");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <section className="space-y-4">
          <h2 className="font-heading text-lg text-forest-green">{t("users.section.account")}</h2>

          <div className="space-y-2">
            <label htmlFor="user-email-readonly" className="text-sm font-medium">
              {t("users.field.email")}
            </label>
            <Input
              id="user-email-readonly"
              type="email"
              value={initialData.email}
              disabled
              readOnly
              aria-readonly="true"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("users.field.first-name")}</FormLabel>
                  <FormControl>
                    <Input required {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("users.field.last-name")}</FormLabel>
                  <FormControl>
                    <Input required {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="font-heading text-lg text-forest-green">{t("users.section.role")}</h2>
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>{t("users.field.role")}</FormLabel>
                <FormControl>
                  <RoleRadio value={field.value ?? "BERATER"} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/users")}
            disabled={isPending}
          >
            {t("users.action.cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function UserForm(props: UserFormProps) {
  if (props.mode === "create") {
    return <CreateUserForm onCreated={props.onCreated} />;
  }
  return <EditUserForm userId={props.userId} initialData={props.initialData} />;
}
