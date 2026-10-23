"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser, isAdminRole } from "@/lib/auth";
import { getOutline } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import type { QuizResult } from "@/types/database";

const uuid = z.guid();
const answersSchema = z.record(z.guid(), z.array(z.guid()).max(10)).refine((value) => Object.keys(value).length <= 100);

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

export type SubmitQuizResult = {
  error?: string;
  result?: QuizResult;
  explanations?: Record<string, string>;
  certificateCode?: string;
};

// Envía las respuestas: la corrección se hace en la base (submit_quiz), así
// las respuestas correctas nunca llegan al navegador antes de responder.
export async function submitQuiz(lessonId: string, answers: Record<string, string[]>): Promise<SubmitQuizResult> {
  if (!uuid.safeParse(lessonId).success) return { error: "Cuestionario inválido." };
  const parsedAnswers = answersSchema.safeParse(answers);
  if (!parsedAnswers.success) return { error: "Respuestas inválidas." };
  const user = await getCurrentUser();
  if (!user) return { error: "Tu sesión venció. Volvé a iniciar sesión." };

  const supabase = await createClient();
  const { data: result, error } = await supabase.rpc("submit_quiz", {
    p_lesson_id: lessonId,
    p_answers: parsedAnswers.data,
  });
  if (error) {
    if (["42501", "22023", "P0002"].includes(error.code)) return { error: error.message };
    console.error("[quiz]", error.code, error.message);
    return { error: "No pudimos corregir el cuestionario. Volvé a intentar." };
  }

  let explanations: Record<string, string> | undefined;
  if (result.correct_options) {
    const { data: review } = await supabase.rpc("quiz_review", { p_lesson_id: lessonId });
    explanations = review?.explanations;
  }
  // Si con este cuestionario terminó el curso, el certificado ya se emitió.
  let certificateCode: string | undefined;
  if (result.passed) {
    const { data: lesson } = await supabase
      .from("lessons")
      .select("modules(course_id)")
      .eq("id", lessonId)
      .single();
    if (lesson?.modules) {
      const { data: certificate } = await supabase
        .from("certificates")
        .select("code")
        .eq("user_id", user.id)
        .eq("course_id", lesson.modules.course_id)
        .maybeSingle();
      certificateCode = certificate?.code;
    }
  }
  refresh();
  return { result, explanations, certificateCode };
}
