"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/validation/auth";

export function Field({
  name,
  label,
  state,
  ...props
}: React.ComponentProps<typeof Input> & { name: string; label: string; state: FormState }) {
  const errors = state.fieldErrors?.[name];
  const errorId = `${name}-error`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        defaultValue={state.values?.[name]}
        aria-invalid={errors ? true : undefined}
        aria-describedby={errors ? errorId : undefined}
        {...props}
      />
      {errors && (
        <p id={errorId} className="text-destructive text-sm">
          {errors[0]}
        </p>
      )}
    </div>
  );
}

export function FormMessage({ state }: { state: FormState }) {
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
  return null;
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}
