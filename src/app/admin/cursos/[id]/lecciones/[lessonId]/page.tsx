import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import { LessonForm } from "./lesson-form";

export const metadata: Metadata = { title: "Editar lección" };

export default async function EditLessonPage({
  params,
}: PageProps<"/admin/cursos/[id]/lecciones/[lessonId]">) {
  const { id, lessonId } = await params;
  const supabase = await createClient();
  const [{ data: lesson }, { data: modules }] = await Promise.all([
    supabase
      .from("lessons")
      .select("*, modules!inner(course_id), lesson_attachments(id, file_name, size_bytes, created_at)")
      .eq("id", lessonId)
      .eq("modules.course_id", id)
      .order("created_at", { referencedTable: "lesson_attachments" })
      .maybeSingle(),
    supabase.from("modules").select("id, title").eq("course_id", id).order("position"),
  ]);
  if (!lesson) notFound();

  return (
    <div className="grid grid-cols-1 gap-6">
      <Link
        href={`/admin/cursos/${id}/temario`}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" /> Volver al temario
      </Link>
      <LessonForm lesson={lesson} modules={modules ?? []} attachments={lesson.lesson_attachments} />
    </div>
  );
}
