import type { Metadata } from "next";

import { SyllabusBuilder } from "@/components/admin/syllabus-builder";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Temario" };

export default async function SyllabusPage({ params }: PageProps<"/admin/cursos/[id]/temario">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: modules } = await supabase
    .from("modules")
    .select("id, title, release_after_days, lessons(id, title, type, is_preview, duration_seconds, position)")
    .eq("course_id", id)
    .order("position")
    .order("position", { referencedTable: "lessons" });

  return (
    <div className="grid grid-cols-1 gap-4">
      <p className="text-muted-foreground text-sm">
        Arrastrá los módulos y las lecciones desde el ícono ⠿ para cambiar el orden (con el teclado:
        Tab hasta el ícono, Espacio, flechas y Espacio otra vez).
      </p>
      <SyllabusBuilder courseId={id} modules={modules ?? []} />
    </div>
  );
}
