"use client";

import { RotateCcw } from "lucide-react";

import { updateLegalText } from "@/app/admin/configuracion/actions";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { FormStatus, SaveButton, useFormAction } from "@/components/admin/form-fields";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Button } from "@/components/ui/button";

export function LegalForm({
  kind,
  html,
  isDefault,
}: {
  kind: "terms" | "privacy";
  html: string;
  isDefault: boolean;
}) {
  const { state, onSubmit, pending } = useFormAction(updateLegalText);
  const confirm = useConfirm();

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <input type="hidden" name="kind" value={kind} />
      {isDefault && (
        <p className="text-muted-foreground text-sm">
          Estás viendo el texto modelo. Revisalo y adaptalo a tu caso (idealmente con un abogado) antes de cobrar por los cursos.
        </p>
      )}
      {/* key: al guardar o restaurar, el editor toma el texto que quedó guardado. */}
      <RichTextEditor key={html} name="html" defaultValue={html} />
      <FormStatus state={state} />
      <div className="flex flex-wrap gap-2">
        <SaveButton pending={pending}>Guardar texto</SaveButton>
        {!isDefault && (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={async (event) => {
              const form = event.currentTarget.form;
              if (!form || !(await confirm("¿Volver al texto modelo? Se pierde el texto que cargaste."))) return;
              form.requestSubmit(form.querySelector<HTMLButtonElement>("button[data-restore]"));
            }}
          >
            <RotateCcw /> Volver al texto modelo
          </Button>
        )}
        <button type="submit" name="restore" value="1" data-restore hidden tabIndex={-1} />
      </div>
    </form>
  );
}
