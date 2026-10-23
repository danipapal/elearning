"use client";

import { useActionState } from "react";

import { sendContactMessage } from "@/app/contacto/actions";
import { Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import { Turnstile } from "@/components/turnstile";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/validation/form";

export function ContactForm() {
  const [state, action] = useActionState<FormState, FormData>(sendContactMessage, {});

  if (state.success) return <FormMessage state={state} />;

  const messageError = state.fieldErrors?.message?.[0];
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <Field name="name" label="Nombre" autoComplete="name" required state={state} />
      <Field name="email" label="Email" type="email" autoComplete="email" required state={state} />
      <div className="grid gap-2">
        <Label htmlFor="message">Mensaje</Label>
        <Textarea
          id="message"
          name="message"
          rows={6}
          maxLength={5000}
          defaultValue={state.values?.message}
          aria-invalid={messageError ? true : undefined}
          required
        />
        {messageError && <p className="text-destructive text-sm">{messageError}</p>}
      </div>
      <div className="hidden" aria-hidden="true">
        <label>
          No completar
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Turnstile resetKey={state} />
      <SubmitButton>Enviar mensaje</SubmitButton>
    </form>
  );
}
