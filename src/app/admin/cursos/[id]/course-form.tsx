"use client";

import Link from "next/link";

import { updateCourse } from "@/app/admin/cursos/actions";
import { FaqEditor } from "@/components/admin/faq-editor";
import { FormField, FormStatus, SaveButton, useFormAction } from "@/components/admin/form-fields";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { LEVEL_LABELS } from "@/lib/courses";
import type { Database } from "@/types/database";

type Course = Database["public"]["Tables"]["courses"]["Row"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function CourseForm({
  course,
  categories,
  instructors,
}: {
  course: Course;
  categories: { id: string; name: string }[];
  instructors: { id: string; name: string }[];
}) {
  const { state, onSubmit, pending } = useFormAction(updateCourse.bind(null, course.id));

  return (
    <form onSubmit={onSubmit} className="grid gap-8" noValidate>
      <Section title="Datos principales">
        <FormField name="title" label="Título" state={state}>
          <Input id="title" name="title" defaultValue={course.title} required maxLength={160} />
        </FormField>
        <FormField
          name="slug"
          label="Slug (dirección del curso)"
          hint={`La página del curso será /cursos/${course.slug}`}
          state={state}
        >
          <Input id="slug" name="slug" defaultValue={course.slug} required maxLength={150} />
        </FormField>
        <FormField name="shortDescription" label="Descripción corta" hint="Se muestra en el catálogo. Máximo 300 caracteres." state={state}>
          <Textarea
            id="shortDescription"
            name="shortDescription"
            defaultValue={course.short_description}
            maxLength={300}
            rows={2}
          />
        </FormField>
        <FormField name="description" label="Descripción completa" state={state}>
          <RichTextEditor name="description" defaultValue={course.description} />
        </FormField>
        <FormField
          name="introVideoUrl"
          label="Video de presentación"
          hint="Enlace de YouTube o Vimeo (opcional)."
          state={state}
        >
          <Input
            id="introVideoUrl"
            name="introVideoUrl"
            type="url"
            defaultValue={course.intro_video_url ?? ""}
            placeholder="https://vimeo.com/123456789"
          />
        </FormField>
      </Section>

      <Section title="Clasificación">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            name="categoryId"
            label="Categoría"
            hint={categories.length === 0 ? "Creá categorías en la sección Categorías." : undefined}
            state={state}
          >
            <NativeSelect id="categoryId" name="categoryId" defaultValue={course.category_id ?? ""}>
              <option value="">Sin categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField name="level" label="Nivel" state={state}>
            <NativeSelect id="level" name="level" defaultValue={course.level}>
              {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField name="language" label="Idioma" state={state}>
            <NativeSelect id="language" name="language" defaultValue={course.language}>
              <option value="es">Español</option>
              <option value="en">Inglés</option>
              <option value="pt">Portugués</option>
            </NativeSelect>
          </FormField>
          <FormField name="instructorId" label="Instructor" state={state}>
            <NativeSelect id="instructorId" name="instructorId" defaultValue={course.instructor_id ?? ""}>
              <option value="">Sin instructor</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.name}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField
            name="accessType"
            label="Tipo de acceso"
            hint="Por ahora solo gratuito con registro. Los pagos llegan en la fase 7."
            state={state}
          >
            <NativeSelect id="accessType" name="accessType" defaultValue={course.access_type}>
              <option value="free">Gratuito con registro</option>
              <option value="paid" disabled>
                Pago único (próximamente)
              </option>
              <option value="membership" disabled>
                Incluido en membresía (próximamente)
              </option>
              <option value="invite" disabled>
                Solo por invitación (próximamente)
              </option>
            </NativeSelect>
          </FormField>
        </div>
      </Section>

      <Section title="Qué se aprende y requisitos">
        <FormField
          name="learningObjectives"
          label="Lo que vas a aprender"
          hint="Uno por línea."
          state={state}
        >
          <Textarea
            id="learningObjectives"
            name="learningObjectives"
            defaultValue={course.learning_objectives.join("\n")}
            rows={4}
          />
        </FormField>
        <FormField name="requirements" label="Requisitos" hint="Uno por línea." state={state}>
          <Textarea
            id="requirements"
            name="requirements"
            defaultValue={course.requirements.join("\n")}
            rows={3}
          />
        </FormField>
      </Section>

      <Section title="Preguntas frecuentes">
        <FaqEditor name="faqs" defaultValue={course.faqs} />
      </Section>

      <div className="bg-background/95 sticky bottom-0 -mx-4 grid gap-3 border-t px-4 py-3 backdrop-blur">
        <FormStatus state={state} />
        <div className="flex items-center gap-3">
          <SaveButton pending={pending}>Guardar cambios</SaveButton>
          <Link href={`/admin/cursos/${course.id}/temario`} className="text-primary text-sm hover:underline">
            Ir al temario →
          </Link>
        </div>
      </div>
    </form>
  );
}
