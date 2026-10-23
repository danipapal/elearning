"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { sanitizeRichText } from "@/lib/sanitize";
import { slugify } from "@/lib/slug";
import { COVERS_BUCKET, FILES_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import {
  attachmentSchema,
  categorySchema,
  courseSchema,
  lessonSchema,
  moduleSchema,
  newCourseSchema,
  newLessonSchema,
} from "@/lib/validation/courses";
import { fieldErrors, type FormState } from "@/lib/validation/form";
import { parseVideoUrl } from "@/lib/video";
import type { CourseStatus, Database } from "@/types/database";

// Todas las acciones verifican el rol en el servidor (requireAdmin) y además
// la base de datos lo exige con RLS.

const uuid = z.guid();
const GENERIC_ERROR = "No se pudo guardar. Volvé a intentar.";

async function uniqueCourseSlug(base: string) {
  const supabase = await createClient();
  const root = base || "curso";
  const { data } = await supabase.from("courses").select("slug").like("slug", `${root}%`);
  const taken = new Set((data ?? []).map((row) => row.slug));
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}

// Borra del Storage los archivos que ya no usa ningún registro (los cursos
// duplicados comparten archivos, así que solo se borran los huérfanos).
async function removeOrphanFiles(paths: string[]) {
  if (paths.length === 0) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("lesson_attachments")
    .select("file_path")
    .in("file_path", paths);
  const stillUsed = new Set((data ?? []).map((row) => row.file_path));
  const orphans = paths.filter((path) => !stillUsed.has(path));
  if (orphans.length) await supabase.storage.from(FILES_BUCKET).remove(orphans);
}

async function removeOrphanCover(path: string | null) {
  if (!path) return;
  const supabase = await createClient();
  const { count } = await supabase
    .from("courses")
    .select("id", { count: "exact", head: true })
    .eq("cover_path", path);
  if (!count) await supabase.storage.from(COVERS_BUCKET).remove([path]);
}

// ---------------------------------------------------------------------
// Cursos
// ---------------------------------------------------------------------

export async function createCourse(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const values = { title: String(formData.get("title") ?? "") };
  const parsed = newCourseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const slug = await uniqueCourseSlug(slugify(parsed.data.title));
  const { data, error } = await supabase
    .from("courses")
    .insert({ title: parsed.data.title, slug, instructor_id: user.id })
    .select("id")
    .single();
  if (error || !data) return { error: GENERIC_ERROR, values };

  redirect(`/admin/cursos/${data.id}`);
}

export async function updateCourse(
  courseId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  if (!uuid.safeParse(courseId).success) return { error: GENERIC_ERROR };

  const parsed = courseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const data = parsed.data;
  const video = data.introVideoUrl ? parseVideoUrl(data.introVideoUrl) : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({
      title: data.title,
      slug: data.slug,
      short_description: data.shortDescription,
      description: sanitizeRichText(data.description),
      intro_video_url: data.introVideoUrl || null,
      intro_video_provider: video?.provider ?? null,
      category_id: data.categoryId || null,
      level: data.level,
      language: data.language,
      instructor_id: data.instructorId || null,
      requirements: data.requirements,
      learning_objectives: data.learningObjectives,
      faqs: data.faqs,
      access_type: data.accessType,
    })
    .eq("id", courseId);

  if (error?.code === "23505") {
    return { fieldErrors: { slug: ["Ya existe otro curso con ese slug."] } };
  }
  if (error) return { error: GENERIC_ERROR };

  refresh();
  return { success: "Cambios guardados." };
}

export async function setCourseCover(courseId: string, path: string) {
  await requireAdmin();
  if (!uuid.safeParse(courseId).success || !path.startsWith(`courses/${courseId}/`)) {
    return { error: "Archivo inválido." };
  }
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("cover_path")
    .eq("id", courseId)
    .single();
  const { error } = await supabase.from("courses").update({ cover_path: path }).eq("id", courseId);
  if (error) return { error: GENERIC_ERROR };
  await removeOrphanCover(course?.cover_path ?? null);
  refresh();
  return {};
}

export async function removeCourseCover(courseId: string) {
  await requireAdmin();
  if (!uuid.safeParse(courseId).success) return;
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("cover_path")
    .eq("id", courseId)
    .single();
  await supabase.from("courses").update({ cover_path: null }).eq("id", courseId);
  await removeOrphanCover(course?.cover_path ?? null);
  refresh();
}

export async function setCourseStatus(courseId: string, status: CourseStatus) {
  await requireAdmin();
  if (!uuid.safeParse(courseId).success) return;
  if (!["draft", "published", "archived"].includes(status)) return;
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("published_at")
    .eq("id", courseId)
    .single();
  await supabase
    .from("courses")
    .update({
      status,
      published_at:
        status === "published" && !course?.published_at
          ? new Date().toISOString()
          : course?.published_at ?? null,
    })
    .eq("id", courseId);
  refresh();
}

export async function duplicateCourse(courseId: string) {
  await requireAdmin();
  if (!uuid.safeParse(courseId).success) return;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("duplicate_course", { p_course_id: courseId });
  if (error || !data) return;
  redirect(`/admin/cursos/${data}`);
}

export async function deleteCourse(courseId: string) {
  await requireAdmin();
  if (!uuid.safeParse(courseId).success) return;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("status, cover_path, modules(lessons(lesson_attachments(file_path)))")
    .eq("id", courseId)
    .single();
  // Un curso publicado primero se despublica: evita borrados accidentales.
  if (!course || course.status === "published") return;

  const paths = course.modules.flatMap((module) =>
    module.lessons.flatMap((lesson) => lesson.lesson_attachments.map((a) => a.file_path)),
  );
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) return;

  await removeOrphanFiles([...new Set(paths)]);
  await removeOrphanCover(course.cover_path);
  redirect("/admin/cursos");
}

// ---------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------

export async function createCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const slug = slugify(parsed.data.name);
  if (!slug) return { fieldErrors: { name: ["Usá letras o números."] } };
  const { error } = await supabase.from("categories").insert({ name: parsed.data.name, slug });
  if (error?.code === "23505") return { fieldErrors: { name: ["Esa categoría ya existe."] } };
  if (error) return { error: GENERIC_ERROR };

  refresh();
  return { success: "Categoría creada." };
}

export async function deleteCategory(categoryId: string) {
  await requireAdmin();
  if (!uuid.safeParse(categoryId).success) return;
  const supabase = await createClient();
  await supabase.from("categories").delete().eq("id", categoryId);
  refresh();
}

// ---------------------------------------------------------------------
// Módulos
// ---------------------------------------------------------------------

export async function createModule(
  courseId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  if (!uuid.safeParse(courseId).success) return { error: GENERIC_ERROR };
  const parsed = moduleSchema.safeParse({
    title: formData.get("title"),
    releaseAfterDays: formData.get("releaseAfterDays") || 0,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { count } = await supabase
    .from("modules")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);
  const { error } = await supabase.from("modules").insert({
    course_id: courseId,
    title: parsed.data.title,
    release_after_days: parsed.data.releaseAfterDays,
    position: count ?? 0,
  });
  if (error) return { error: GENERIC_ERROR };

  refresh();
  return { success: "Módulo creado." };
}

export async function updateModule(
  moduleId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  if (!uuid.safeParse(moduleId).success) return { error: GENERIC_ERROR };
  const parsed = moduleSchema.safeParse({
    title: formData.get("title"),
    releaseAfterDays: formData.get("releaseAfterDays") || 0,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("modules")
    .update({ title: parsed.data.title, release_after_days: parsed.data.releaseAfterDays })
    .eq("id", moduleId);
  if (error) return { error: GENERIC_ERROR };

  refresh();
  return { success: "Guardado." };
}

export async function deleteModule(moduleId: string) {
  await requireAdmin();
  if (!uuid.safeParse(moduleId).success) return;
  const supabase = await createClient();
  const { data: lessons } = await supabase
    .from("lessons")
    .select("lesson_attachments(file_path)")
    .eq("module_id", moduleId);
  const paths = (lessons ?? []).flatMap((lesson) =>
    lesson.lesson_attachments.map((a) => a.file_path),
  );
  const { error } = await supabase.from("modules").delete().eq("id", moduleId);
  if (error) return;
  await removeOrphanFiles([...new Set(paths)]);
  refresh();
}

const reorderSchema = z.array(z.guid()).max(500);

export async function reorderModules(courseId: string, moduleIds: string[]) {
  await requireAdmin();
  const ids = reorderSchema.safeParse(moduleIds);
  if (!uuid.safeParse(courseId).success || !ids.success) return;
  const supabase = await createClient();
  await Promise.all(
    ids.data.map((id, position) =>
      supabase.from("modules").update({ position }).eq("id", id).eq("course_id", courseId),
    ),
  );
  refresh();
}

// ---------------------------------------------------------------------
// Lecciones
// ---------------------------------------------------------------------

export async function createLesson(
  moduleId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  if (!uuid.safeParse(moduleId).success) return { error: GENERIC_ERROR };
  const parsed = newLessonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data: courseModule } = await supabase
    .from("modules")
    .select("course_id")
    .eq("id", moduleId)
    .single();
  if (!courseModule) return { error: GENERIC_ERROR };

  const { count } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId);
  const { data, error } = await supabase
    .from("lessons")
    .insert({
      module_id: moduleId,
      title: parsed.data.title,
      type: parsed.data.type,
      position: count ?? 0,
    })
    .select("id")
    .single();
  if (error || !data) return { error: GENERIC_ERROR };

  redirect(`/admin/cursos/${courseModule.course_id}/lecciones/${data.id}`);
}

export async function updateLesson(
  lessonId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  if (!uuid.safeParse(lessonId).success) return { error: GENERIC_ERROR };
  const parsed = lessonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const data = parsed.data;
  const usesVideo = data.type === "video" || data.type === "mixed";
  const video = usesVideo && data.videoUrl ? parseVideoUrl(data.videoUrl) : null;

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("lessons")
    .select("module_id, modules(course_id)")
    .eq("id", lessonId)
    .single();
  if (!current?.modules) return { error: GENERIC_ERROR };

  const update: Database["public"]["Tables"]["lessons"]["Update"] = {
    title: data.title,
    type: data.type,
    video_url: video ? data.videoUrl : null,
    video_provider: video?.provider ?? null,
    duration_seconds:
      data.durationMinutes === undefined ? null : Math.round(data.durationMinutes * 60),
    content: sanitizeRichText(data.content),
    is_preview: data.isPreview === "on",
  };

  // Mover a otro módulo del mismo curso: queda al final de ese módulo.
  if (data.moduleId !== current.module_id) {
    const { data: target } = await supabase
      .from("modules")
      .select("course_id")
      .eq("id", data.moduleId)
      .single();
    if (target?.course_id !== current.modules.course_id) return { error: GENERIC_ERROR };
    const { count } = await supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("module_id", data.moduleId);
    update.module_id = data.moduleId;
    update.position = count ?? 0;
  }

  const { error } = await supabase.from("lessons").update(update).eq("id", lessonId);
  if (error) return { error: GENERIC_ERROR };
  // Si dejó de ser cuestionario, se borra el cuestionario (si no, la lección
  // no se podría marcar como completada).
  if (data.type !== "quiz") await supabase.rpc("admin_delete_quiz", { p_lesson_id: lessonId });

  refresh();
  return { success: "Lección guardada." };
}

export async function deleteLesson(lessonId: string) {
  await requireAdmin();
  if (!uuid.safeParse(lessonId).success) return;
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("modules(course_id), lesson_attachments(file_path)")
    .eq("id", lessonId)
    .single();
  if (!lesson?.modules) return;
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) return;
  await removeOrphanFiles(lesson.lesson_attachments.map((a) => a.file_path));
  redirect(`/admin/cursos/${lesson.modules.course_id}/temario`);
}

export async function reorderLessons(moduleId: string, lessonIds: string[]) {
  await requireAdmin();
  const ids = reorderSchema.safeParse(lessonIds);
  if (!uuid.safeParse(moduleId).success || !ids.success) return;
  const supabase = await createClient();
  await Promise.all(
    ids.data.map((id, position) =>
      supabase.from("lessons").update({ position }).eq("id", id).eq("module_id", moduleId),
    ),
  );
  refresh();
}

// ---------------------------------------------------------------------
// Adjuntos (PDF)
// ---------------------------------------------------------------------

// El navegador sube el PDF directo a Supabase Storage (las políticas de
// Storage exigen ser admin y el bucket limita tipo y tamaño); acá solo se
// registra el archivo en la lección.
export async function addAttachment(input: {
  lessonId: string;
  path: string;
  fileName: string;
  sizeBytes: number;
}) {
  await requireAdmin();
  const parsed = attachmentSchema.safeParse(input);
  if (!parsed.success || !parsed.data.path.startsWith(`lessons/${parsed.data.lessonId}/`)) {
    return { error: "Archivo inválido." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("lesson_attachments").insert({
    lesson_id: parsed.data.lessonId,
    file_path: parsed.data.path,
    file_name: parsed.data.fileName,
    size_bytes: parsed.data.sizeBytes,
    mime_type: "application/pdf",
  });
  if (error) return { error: GENERIC_ERROR };
  refresh();
  return {};
}

export async function deleteAttachment(attachmentId: string) {
  await requireAdmin();
  if (!uuid.safeParse(attachmentId).success) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("lesson_attachments")
    .delete()
    .eq("id", attachmentId)
    .select("file_path")
    .single();
  if (data) await removeOrphanFiles([data.file_path]);
  refresh();
}
