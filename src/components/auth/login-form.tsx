"use client";

import Link from "next/link";
import { useActionState } from "react";

import { login } from "@/app/(auth)/actions";
import { Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import type { FormState } from "@/lib/validation/auth";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [state, action] = useActionState<FormState, FormData>(login, { error: initialError });

  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field name="email" label="Email" type="email" autoComplete="email" required state={state} />
      <Field
        name="password"
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        required
        state={state}
      />
      <div className="text-right text-sm">
        <Link href="/recuperar" className="text-primary hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      <SubmitButton>Iniciar sesión</SubmitButton>
    </form>
  );
}
