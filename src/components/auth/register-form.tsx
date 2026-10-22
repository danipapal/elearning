"use client";

import Link from "next/link";
import { useActionState } from "react";

import { register } from "@/app/(auth)/actions";
import { Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import type { FormState } from "@/lib/validation/auth";

export function RegisterForm() {
  const [state, action] = useActionState<FormState, FormData>(register, {});

  if (state.success) {
    return <FormMessage state={state} />;
  }

  const termsError = state.fieldErrors?.acceptTerms?.[0];

  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <Field name="fullName" label="Nombre y apellido" autoComplete="name" required state={state} />
      <Field name="email" label="Email" type="email" autoComplete="email" required state={state} />
      <Field
        name="password"
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        required
        state={state}
      />
      <Field
        name="confirmPassword"
        label="Repetí la contraseña"
        type="password"
        autoComplete="new-password"
        required
        state={state}
      />
      <p className="text-muted-foreground -mt-2 text-xs">
        Mínimo 8 caracteres, con al menos una letra y un número.
      </p>
      <div className="grid gap-1">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="acceptTerms" className="mt-0.5 size-4 accent-current" />
          <span>
            Acepto los{" "}
            <Link href="/terminos" className="text-primary hover:underline" target="_blank">
              términos y condiciones
            </Link>{" "}
            y la{" "}
            <Link href="/privacidad" className="text-primary hover:underline" target="_blank">
              política de privacidad
            </Link>
            .
          </span>
        </label>
        {termsError && <p className="text-destructive text-sm">{termsError}</p>}
      </div>
      <SubmitButton>Crear cuenta gratis</SubmitButton>
    </form>
  );
}
