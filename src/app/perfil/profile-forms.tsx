"use client";

import { useState, useTransition } from "react";

import { changePassword, deleteAccount, setAnnouncementEmails, updateProfile } from "@/app/perfil/actions";
import { FormField, FormStatus, SaveButton, useFormAction } from "@/components/admin/form-fields";
import { Input } from "@/components/ui/input";

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const { state, onSubmit, pending } = useFormAction(updateProfile);
  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <FormField name="fullName" label="Nombre y apellido" hint="Es el nombre que figura en tus certificados nuevos." state={state}>
        <Input id="fullName" name="fullName" defaultValue={fullName} autoComplete="name" maxLength={120} required />
      </FormField>
      <div className="grid gap-2">
        <p className="text-sm font-medium">Email</p>
        <p className="text-muted-foreground text-sm">{email}</p>
      </div>
      <FormStatus state={state} />
      <div>
        <SaveButton pending={pending}>Guardar</SaveButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const { state, onSubmit, pending } = useFormAction(changePassword);
  return (
    <form
      key={state.success}
      onSubmit={onSubmit}
      className="grid gap-4"
      noValidate
    >
      <FormField name="currentPassword" label="Contraseña actual" state={state}>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="password" label="Nueva contraseña" hint="Mínimo 8 caracteres, con letras y números." state={state}>
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
        </FormField>
        <FormField name="confirmPassword" label="Repetí la nueva contraseña" state={state}>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
        </FormField>
      </div>
      <FormStatus state={state} />
      <div>
        <SaveButton pending={pending}>Cambiar contraseña</SaveButton>
      </div>
    </form>
  );
}

export function AnnouncementsToggle({ enabled }: { enabled: boolean }) {
  const [checked, setChecked] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid gap-2">
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4"
          checked={checked}
          disabled={pending}
          onChange={(event) => {
            const value = event.target.checked;
            setChecked(value);
            setError(null);
            startTransition(async () => {
              const result = await setAnnouncementEmails(value);
              if (result.error) {
                setChecked(!value);
                setError(result.error);
              }
            });
          }}
        />
        <span>
          Quiero recibir anuncios por email (novedades y cursos nuevos).
          <span className="text-muted-foreground block text-xs">
            Los emails sobre tu cuenta y tus certificados te llegan igual.
          </span>
        </span>
      </label>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}

export function DeleteAccountForm() {
  const { state, onSubmit, pending } = useFormAction(deleteAccount);
  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <p className="text-sm">
        Se borran para siempre tu cuenta, tus inscripciones, tu progreso y tus certificados (dejan de poder verificarse).
        No se puede deshacer.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="currentPassword" label="Tu contraseña" htmlFor="deletePassword" state={state}>
          <Input id="deletePassword" name="currentPassword" type="password" autoComplete="current-password" required />
        </FormField>
        <FormField name="confirmation" label="Escribí ELIMINAR para confirmar" state={state}>
          <Input id="confirmation" name="confirmation" autoComplete="off" required />
        </FormField>
      </div>
      <FormStatus state={state} />
      <div>
        <SaveButton pending={pending} variant="destructive">
          Eliminar mi cuenta
        </SaveButton>
      </div>
    </form>
  );
}
