import { getCurrentUser } from "@/lib/auth";
import { rateLimit, HOUR } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

// Descarga de los datos personales del usuario (derecho de acceso, Ley 25.326).
// Todo se lee con su propia sesión: RLS garantiza que sean solo los suyos.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Iniciá sesión para descargar tus datos.", { status: 401 });
  if (!rateLimit(`my-data:${user.id}`, 10, HOUR)) {
    return new Response("Demasiadas descargas. Probá más tarde.", { status: 429 });
  }

  const supabase = await createClient();
  const [profile, enrollments, progress, attempts, certificates] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, role, status, email_announcements, created_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("enrollments")
      .select("enrolled_at, expires_at, status, source, last_accessed_at, courses(title)")
      .eq("user_id", user.id),
    supabase.from("lesson_progress").select("completed_at, lessons(title)").eq("user_id", user.id),
    supabase.from("quiz_attempts").select("created_at, score, passed, lesson_id").eq("user_id", user.id),
    supabase.from("certificates").select("code, full_name, course_title, issued_at").eq("user_id", user.id),
  ]);

  const quizIds = [...new Set((attempts.data ?? []).map((attempt) => attempt.lesson_id))];
  const { data: quizLessons } = quizIds.length
    ? await supabase.from("lessons").select("id, title").in("id", quizIds)
    : { data: [] };
  const quizTitles = new Map((quizLessons ?? []).map((lesson) => [lesson.id, lesson.title]));

  const data = {
    exportado: new Date().toISOString(),
    cuenta: { email: user.email, ...profile.data },
    inscripciones: (enrollments.data ?? []).map(({ courses, ...row }) => ({ curso: courses?.title ?? null, ...row })),
    lecciones_completadas: (progress.data ?? []).map(({ lessons, ...row }) => ({ leccion: lessons?.title ?? null, ...row })),
    cuestionarios: (attempts.data ?? []).map(({ lesson_id, ...row }) => ({
      cuestionario: quizTitles.get(lesson_id) ?? null,
      ...row,
    })),
    certificados: certificates.data ?? [],
  };

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="mis-datos.json"`,
      "cache-control": "private, no-store",
    },
  });
}
