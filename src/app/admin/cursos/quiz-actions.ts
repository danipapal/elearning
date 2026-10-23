"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { quizSchema } from "@/lib/validation/quiz";

export type QuizSaveResult = { error?: string; success?: string; issues?: Record<string, string> };

// Guarda el cuestionario completo y marca la lección como de tipo cuestionario.
export async function saveQuiz(lessonId: string, input: unknown): Promise<QuizSaveResult> {
  await requireAdmin();
  if (!z.guid().safeParse(lessonId).success) return { error: "Lección inválida." };
  const parsed = quizSchema.safeParse(input);
  if (!parsed.success) {
    // "questions.2.options" -> mensaje para mostrar junto a la pregunta 3.
    const issues: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.slice(0, 2).join(".") || "quiz";
      issues[key] ??= issue.message;
    }
    return { error: "Revisá las preguntas marcadas.", issues };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_save_quiz", { p_lesson_id: lessonId, p_quiz: parsed.data });
  if (error) {
    console.error("[admin] guardar cuestionario", error.code, error.message);
    return { error: error.code === "22023" ? error.message : "No se pudo guardar el cuestionario." };
  }
  await supabase.from("lessons").update({ type: "quiz" }).eq("id", lessonId);
  refresh();
  return { success: "Cuestionario guardado." };
}
