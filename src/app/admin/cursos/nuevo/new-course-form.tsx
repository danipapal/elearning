"use client";

import { useActionState } from "react";

import { createCourse } from "@/app/admin/cursos/actions";
import { FormField, FormStatus, SaveButton } from "@/components/admin/form-fields";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/validation/form";

export function NewCourseForm() {
  const [state, action] = useActionState<FormState, FormData>(createCourse, {});
  return (
    <form action={action} className="grid grid-cols-1 gap-4">
      <FormStatus state={state} />
      <FormField name="title" label="Título del curso" state={state}>
        <Input
          id="title"
          name="title"
          defaultValue={state.values?.title}
          placeholder="Ej: Fotografía para principiantes"
          required
          maxLength={160}
          autoFocus
        />
      </FormField>
      <div>
        <SaveButton>Crear curso</SaveButton>
      </div>
    </form>
  );
}
