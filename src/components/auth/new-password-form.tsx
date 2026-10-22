"use client";

import { useActionState } from "react";

import { updatePassword } from "@/app/(auth)/actions";
import { Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import type { FormState } from "@/lib/validation/auth";

export function NewPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(updatePassword, {});

  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <Field
        name="password"
        label="Nueva contraseña"
        type="password"
        autoComplete="new-password"
        required
        state={state}
      />
      <Field
        name="confirmPassword"
        label="Repetí la nueva contraseña"
        type="password"
        autoComplete="new-password"
        required
        state={state}
      />
      <SubmitButton>Guardar contraseña</SubmitButton>
    </form>
  );
}
