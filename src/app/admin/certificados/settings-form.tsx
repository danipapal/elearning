"use client";

import { updateCertificateSettings } from "@/app/admin/certificados/actions";
import { FormField, FormStatus, SaveButton, useFormAction } from "@/components/admin/form-fields";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CertificateSettings } from "@/types/database";

export function CertificateSettingsForm({ settings }: { settings: CertificateSettings }) {
  const { state, onSubmit, pending } = useFormAction(updateCertificateSettings);
  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <FormField name="title" label="Título" state={state}>
        <Input id="title" name="title" defaultValue={settings.title} maxLength={80} required />
      </FormField>
      <FormField name="recipientLabel" label="Texto antes del nombre" state={state}>
        <Input id="recipientLabel" name="recipientLabel" defaultValue={settings.recipient_label} maxLength={80} />
      </FormField>
      <FormField
        name="body"
        label="Texto después del nombre"
        hint="Podés usar {curso} y {fecha}: se reemplazan por el nombre del curso y la fecha de emisión."
        state={state}
      >
        <Textarea id="body" name="body" defaultValue={settings.body} rows={3} maxLength={400} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="signerName" label="Nombre de quien firma" state={state}>
          <Input id="signerName" name="signerName" defaultValue={settings.signer_name} maxLength={80} />
        </FormField>
        <FormField name="signerTitle" label="Cargo" state={state}>
          <Input id="signerTitle" name="signerTitle" defaultValue={settings.signer_title} maxLength={80} placeholder="Ej: Director académico" />
        </FormField>
      </div>
      <FormStatus state={state} />
      <div>
        <SaveButton pending={pending}>Guardar plantilla</SaveButton>
      </div>
    </form>
  );
}
