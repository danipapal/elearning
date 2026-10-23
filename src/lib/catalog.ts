import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { LessonType, OutlineRow } from "@/types/database";

export type OutlineLesson = {
  id: string;
  title: string;
  type: LessonType;
  durationSeconds: number | null;
  isPreview: boolean;
  completed: boolean;
  // El usuario actual puede abrirla (vista previa, inscrito y liberada, o admin)
  accessible: boolean;
};

export type OutlineModule = {
  id: string;
  title: string;
  releaseAfterDays: number;
  // Cuándo se libera para el usuario actual (null si no está inscrito)
  unlockAt: Date | null;
  locked: boolean;
  lessons: OutlineLesson[];
};

export type CourseOutline = {
  modules: OutlineModule[];
  lessons: OutlineLesson[];
  totalSeconds: number;
  completedCount: number;
};

export function buildOutline(rows: OutlineRow[], isAdmin: boolean): CourseOutline {
  const now = Date.now();
  const modules: OutlineModule[] = [];
  for (const row of rows) {
    let courseModule = modules.at(-1);
    if (!courseModule || courseModule.id !== row.module_id) {
      const unlockAt = row.unlock_at ? new Date(row.unlock_at) : null;
      courseModule = {
        id: row.module_id,
        title: row.module_title,
        releaseAfterDays: row.release_after_days,
        unlockAt,
        locked: !isAdmin && (!unlockAt || unlockAt.getTime() > now),
        lessons: [],
      };
      modules.push(courseModule);
    }
    if (!row.lesson_id) continue;
    const isPreview = Boolean(row.is_preview);
    courseModule.lessons.push({
      id: row.lesson_id,
      title: row.lesson_title ?? "",
      type: row.lesson_type ?? "text",
      durationSeconds: row.duration_seconds,
      isPreview,
      completed: row.completed,
      accessible: isAdmin || isPreview || !courseModule.locked,
    });
  }
  const lessons = modules.flatMap((courseModule) => courseModule.lessons);
  return {
    modules,
    lessons,
    totalSeconds: lessons.reduce((total, lesson) => total + (lesson.durationSeconds ?? 0), 0),
    completedCount: lessons.filter((lesson) => lesson.completed).length,
  };
}

export const getOutline = cache(async (courseId: string, isAdmin: boolean) => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("course_outline", { p_course_id: courseId });
  return buildOutline(data ?? [], isAdmin);
});

export const getCourseBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("*, categories(name, slug)")
    .eq("slug", slug)
    .maybeSingle();
  return data;
});

export const getEnrollment = cache(async (courseId: string, userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select("id, status, expires_at, enrolled_at, last_lesson_id")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || data.status !== "active") return null;
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return null;
  return data;
});

export function formatTotalDuration(seconds: number) {
  if (!seconds) return null;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function formatUnlockDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(date);
}
