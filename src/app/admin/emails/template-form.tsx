"use client";

import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";

import { sendTemplateTest, updateEmailTemplate } from "@/app/admin/emails/actions";
import { FormField, FormStatus, SaveButton, useFormAction } from "@/components/admin/form-fields";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EmailTemplate } from "@/types/database";

export function EmailTemplateForm({
  template,
  placeholders,
  canSend,
}: {
  template: EmailTemplate;
  placeholders: string;
  canSend: boolean;
}) {
  const { state, onSubmit, pending } = useFormAction(updateEmailTemplate);
  const [test, setTest] = useState<{ error?: string; success?: string }>({});
  const [testing, startTest] = useTransition();

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <input type="hidden" name="key" value={template.key} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={template.enabled} className="size-4" />
        Enviar este email automáticamente
      </label>
      <FormField name="subject" label="Asunto" state={state}>
        <Input id="subject" name="subject" defaultValue={template.subject} maxLength={150} required />
      </FormField>
      <FormField name="body_html" label="Texto" hint={`Podés usar ${placeholders}.`} state={state}>
        <RichTextEditor name="body_html" defaultValue={template.body_html} />
      </FormField>
      <FormField name="button_label" label="Texto del botón" hint="Dejalo vacío para no mostrar botón." state={state}>
        <Input id="button_label" name="button_label" defaultValue={template.button_label} maxLength={40} />
      </FormField>
      <FormStatus state={state} />
      <FormStatus state={test} />
      <div className="flex flex-wrap gap-2">
        <SaveButton pending={pending}>Guardar plantilla</SaveButton>
        <Button
          type="button"
          variant="outline"
          disabled={testing || !canSend}
          title={canSend ? undefined : "Configurá Resend para poder enviar emails"}
          onClick={() => startTest(async () => setTest(await sendTemplateTest(template.key)))}
        >
          {testing ? <Loader2 className="animate-spin" /> : <Send />} Enviarme una prueba
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">La prueba usa la plantilla guardada.</p>
    </form>
  );
}
