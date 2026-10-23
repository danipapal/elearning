"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser, isAdminRole } from "@/lib/auth";
import { getOutline } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";

const uuid = z.guid();

// Inscripción gratuita. RLS garantiza que solo sea para uno mismo y en un
// curso publicado y gratuito.
export async function enroll(courseId: string, slug: string) {
  if (!uuid.safeParse(courseId).success) return { error: "Curso inválido." };
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/cursos/${slug}`)}`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("enrollments")
    .insert({ user_id: user.id, course_id: courseId, source: "free" });
  // 23505 = ya estaba inscrito: no es un error para el alumno.
  if (error && error.code !== "23505") {
    return { error: "No pudimos inscribirte. Volvé a intentar en unos minutos." };
  }

  const outline = await getOutline(courseId, isAdminRole(user.role));
  const first = outline.lessons.find((lesson) => lesson.accessible);
  redirect(first ? `/cursos/${slug}/lecciones/${first.id}` : `/cursos/${slug}`);
}

export async function setLessonCompleted(lessonId: string, completed: boolean) {
  if (!uuid.safeParse(lessonId).success) return;
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createClient();
  if (completed) {
    // RLS solo lo permite si el alumno tiene acceso a la lección.
    await supabase
      .from("lesson_progress")
      .upsert({ user_id: user.id, lesson_id: lessonId }, { ignoreDuplicates: true });
  } else {
    await supabase.from("lesson_progress").delete().eq("user_id", user.id).eq("lesson_id", lessonId);
  }
  refresh();
}
