"use client";

import { startTransition, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/validation/form";

// Envuelve un campo con su etiqueta, ayuda y error de validación.
export function FormField({
  name,
  label,
  hint,
  state,
  className,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  state: FormState;
  className?: string;
  children: React.ReactNode;
}) {
  const error = state.fieldErrors?.[name]?.[0];
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={name}>{label}</Label>
      {children}
      {hint && !error && <p className="text-muted-foreground text-xs">{hint}</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}

export function FormStatus({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p role="status" className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
        {state.success}
      </p>
    );
  }
  if (state.fieldErrors) {
    return (
      <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
        Revisá los campos marcados.
      </p>
    );
  }
  return null;
}

export function SaveButton({
  children = "Guardar",
  pending: pendingProp,
  ...props
}: React.ComponentProps<typeof Button> & { pending?: boolean }) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}

// Como useActionState, pero sin el reseteo automático del formulario que hace
// React al terminar la acción: en formularios largos, un error de validación
// no debe borrar lo que el usuario escribió.
export function useFormAction(
  action: (state: FormState, formData: FormData) => Promise<FormState>,
) {
  const [state, dispatch, pending] = useActionState(action, {});
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };
  return { state, onSubmit, pending };
}
