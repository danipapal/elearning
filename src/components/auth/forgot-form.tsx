"use client";

import { useActionState } from "react";

import { forgotPassword } from "@/app/(auth)/actions";
import { Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import type { FormState } from "@/lib/validation/auth";

export function ForgotForm() {
  const [state, action] = useActionState<FormState, FormData>(forgotPassword, {});

  if (state.success) {
    return <FormMessage state={state} />;
  }

  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <Field name="email" label="Email" type="email" autoComplete="email" required state={state} />
      <SubmitButton>Enviar enlace</SubmitButton>
    </form>
  );
}
