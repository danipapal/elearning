"use client";

import { useActionState } from "react";
import { Upload, UserPlus } from "lucide-react";

import { bulkEnroll, enrollUser, type BulkEnrollState } from "@/app/admin/usuarios/actions";
import { FormField, FormStatus, SaveButton, useFormAction } from "@/components/admin/form-fields";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type CourseOption = { id: string; title: string; status: string };

function CourseSelect({ courses, defaultValue }: { courses: CourseOption[]; defaultValue?: string }) {
  return (
    <NativeSelect id="courseId" name="courseId" defaultValue={defaultValue ?? ""} required>
      <option value="" disabled>
        Elegí un curso
      </option>
      {courses.map((course) => (
        <option key={course.id} value={course.id}>
          {course.title}
          {course.status !== "published" ? " (borrador)" : ""}
        </option>
      ))}
    </NativeSelect>
  );
}

export function EnrollUserForm({ userId, courses }: { userId: string; courses: CourseOption[] }) {
  const { state, onSubmit, pending } = useFormAction(enrollUser);
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <input type="hidden" name="userId" value={userId} />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-start">
        <FormField name="courseId" label="Curso" state={state}>
          <CourseSelect courses={courses} />
        </FormField>
        <FormField name="expiresAt" label="Vence (opcional)" state={state}>
          <Input id="expiresAt" name="expiresAt" type="date" />
        </FormField>
        <div className="sm:pt-7">
          <SaveButton pending={pending}>
            <UserPlus /> Inscribir
          </SaveButton>
        </div>
      </div>
      <FormStatus state={state} />
    </form>
  );
}

const RESULT_LABELS = {
  enrolled: "Inscrito",
  updated: "Ya estaba inscrito (actualizado)",
  not_found: "No tiene cuenta",
} as const;

export function BulkEnrollForm({ courses, defaultCourseId }: { courses: CourseOption[]; defaultCourseId?: string }) {
  const [state, action] = useActionState<BulkEnrollState, FormData>(bulkEnroll, {});
  const missing = state.results?.filter((row) => row.result === "not_found") ?? [];

  return (
    <div className="grid gap-6">
      <form action={action} className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
          <FormField name="courseId" label="Curso" state={state}>
            <CourseSelect courses={courses} defaultValue={defaultCourseId} />
          </FormField>
          <FormField name="expiresAt" label="Vence (opcional)" state={state}>
            <Input id="expiresAt" name="expiresAt" type="date" />
          </FormField>
        </div>
        <FormField
          name="file"
          label="Archivo CSV"
          hint="Puede tener otras columnas: tomamos todo lo que parezca un email. Máximo 1000 por vez."
          state={state}
        >
          <Input id="file" name="file" type="file" accept=".csv,.txt,text/csv,text/plain" />
        </FormField>
        <FormField name="emails" label="O pegá los emails" hint="Uno por línea, o separados por comas." state={state}>
          <Textarea id="emails" name="emails" rows={5} placeholder={"ana@ejemplo.com\nbeto@ejemplo.com"} />
        </FormField>
        <div>
          <SaveButton>
            <Upload /> Inscribir
          </SaveButton>
        </div>
        <FormStatus state={state} />
      </form>

      {state.results && (
        <div className="grid gap-3">
          {missing.length > 0 && (
            <p className="text-muted-foreground text-sm">
              {missing.length === 1 ? "1 email no tiene" : `${missing.length} emails no tienen`} cuenta: tienen
              que registrarse primero y después los podés inscribir.
            </p>
          )}
          <ul className="divide-y rounded-lg border text-sm">
            {state.results.map((row) => (
              <li key={row.email} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span className="min-w-0 truncate">{row.email}</span>
                <span className={row.result === "not_found" ? "text-destructive" : "text-muted-foreground"}>
                  {RESULT_LABELS[row.result]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
