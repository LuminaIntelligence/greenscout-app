"use client";

/**
 * T-041a NewUserClient — client wrapper that owns the post-create
 * temp-password dialog state. Sits between the Server Component page
 * (which runs the auth gate) and the shared `UserForm`.
 */

import { useState } from "react";

import { TempPasswordDialog } from "@/features/users/components/temp-password-dialog";
import { UserForm } from "@/features/users/components/user-form";

interface SuccessState {
  userId: string;
  tempPassword: string;
}

export function NewUserClient() {
  const [success, setSuccess] = useState<SuccessState | null>(null);

  return (
    <>
      <UserForm
        mode="create"
        onCreated={(result) =>
          setSuccess({ userId: result.userId, tempPassword: result.tempPassword })
        }
      />
      {success !== null && (
        <TempPasswordDialog
          open
          tempPassword={success.tempPassword}
          onClose={() => setSuccess(null)}
        />
      )}
    </>
  );
}
