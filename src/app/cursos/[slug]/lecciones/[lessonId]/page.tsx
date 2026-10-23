import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Award, ChevronLeft, ChevronRight, Download, FileText, Lock } from "lucide-react";

import { CompleteButton } from "@/components/course/complete-button";
import { CourseOutline } from "@/components/course/course-outline";
import { QuizPlayer } from "@/components/course/quiz-player";
import { Button } from "@/components/ui/button";
import { VideoEmbed } from "@/components/video-embed";
import { getCurrentUser, isAdminRole } from "@/lib/auth";
import { formatUnlockDate, getCourseBySlug, getEnrollment, getOutline } from "@/lib/catalog";
import { sanitizeRichText } from "@/lib/sanitize";
import { formatBytes } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false } };

export default async function LessonPage({ params }: PageProps<"/cursos/[slug]/lecciones/[lessonId]">) {
  const { slug, lessonId } = await params;
  const [course, user] = await Promise.all([getCourseBySlug(slug), getCurrentUser()]);
  if (!course) notFound();

  const isAdmin = Boolean(user && isAdminRole(user.role));
  const [outline, enrollment] = await Promise.all([
    getOutline(course.id, isAdmin),
    user ? getEnrollment(course.id, user.id) : null,
  ]);
  const index = outline.lessons.findIndex((lesson) => lesson.id === lessonId);
  if (index === -1) notFound();
  const current = outline.lessons[index];
  const lessonPath = `/cursos/${slug}/lecciones/${lessonId}`;

  if (!current.accessible) {
    if (!user) redirect(`/login?next=${encodeURIComponent(lessonPath)}`);
    if (!enrollment) redirect(`/cursos/${slug}`);
  }

  const supabase = await createClient();
  const { data: lesson } = current.accessible
    ? await supabase
        .from("lessons")
        .select("id, title, type, video_url, content, lesson_attachments(id, file_name, size_bytes)")
        .eq("id", lessonId)
        .maybeSingle()
    : { data: null };

  const quiz = lesson?.type === "quiz" ? await loadQuiz(lesson.id, user?.id) : null;
  const finished = Boolean(enrollment) && outline.lessons.length > 0 && outline.completedCount === outline.lessons.length;
  const { data: certificate } =
    finished && user
      ? await supabase
          .from("certificates")
          .select("code")
          .eq("course_id", course.id)
          .eq("user_id", user.id)
          .maybeSingle()
      : { data: null };

  // Recordar dónde quedó el alumno para "Continuar donde lo dejé".
  if (lesson && enrollment && user) {
    await supabase
      .from("enrollments")
      .update({ last_lesson_id: lessonId, last_accessed_at: new Date().toISOString() })
      .eq("id", enrollment.id);
  }

  const previous = outline.lessons.slice(0, index).findLast((item) => item.accessible);
  const next = outline.lessons.slice(index + 1).find((item) => item.accessible);
  const lockedModule = outline.modules.find((courseModule) =>
    courseModule.lessons.some((item) => item.id === lessonId),
  );
  const progress = outline.lessons.length
    ? Math.round((outline.completedCount / outline.lessons.length) * 100)
    : 0;
  const content = lesson ? sanitizeRichText(lesson.content) : "";

  const sidebar = (
    <div className="grid gap-4">
      {enrollment && (
        <div className="grid gap-1.5">
          <div className="flex justify-between text-sm">
            <span>Tu progreso</span>
            <span className="font-medium">
              {outline.completedCount}/{outline.lessons.length} · {progress}%
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div className="bg-primary h-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      <CourseOutline
        modules={outline.modules}
        slug={slug}
        currentLessonId={lessonId}
        showProgress={Boolean(enrollment)}
        compact
      />
    </div>
  );

  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid min-w-0 content-start gap-6">
        <Link
          href={`/cursos/${slug}`}
          className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> {course.title}
        </Link>

        {!lesson ? (
          <div className="bg-muted/40 grid justify-items-center gap-3 rounded-xl border p-10 text-center">
            <Lock className="text-muted-foreground size-8" />
            <h1 className="text-xl font-semibold">{current.title}</h1>
            <p className="text-muted-foreground">
              {lockedModule?.unlockAt
                ? `Esta lección se habilita el ${formatUnlockDate(lockedModule.unlockAt)}.`
                : "Todavía no tenés acceso a esta lección."}
            </p>
          </div>
        ) : (
          <>
            {lesson.video_url && (lesson.type === "video" || lesson.type === "mixed") && (
              <VideoEmbed url={lesson.video_url} title={lesson.title} />
            )}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h1 className="text-2xl font-bold sm:text-3xl">{lesson.title}</h1>
              {enrollment && !quiz && <CompleteButton lessonId={lesson.id} completed={current.completed} />}
            </div>
            {!enrollment && !isAdmin && (
              <div className="bg-primary/5 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-sm">
                <span>Estás viendo una lección de vista previa.</span>
                <Button asChild size="sm">
                  <Link href={`/cursos/${slug}`}>Inscribirme gratis</Link>
                </Button>
              </div>
            )}
            {certificate && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
                <span className="font-medium">¡Completaste el curso! 🎉</span>
                <Button asChild size="sm">
                  <Link href={`/certificados/${certificate.code}`}>
                    <Award /> Ver mi certificado
                  </Link>
                </Button>
              </div>
            )}
            {content && <div className="prose-content" dangerouslySetInnerHTML={{ __html: content }} />}
            {quiz &&
              (quiz.questions.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                  Este cuestionario todavía no tiene preguntas.
                </p>
              ) : (
                <QuizPlayer
                  lessonId={lesson.id}
                  questions={quiz.questions}
                  passingScore={quiz.passingScore}
                  maxAttempts={quiz.maxAttempts}
                  attemptsUsed={quiz.attemptsUsed}
                  bestScore={quiz.bestScore}
                  passed={quiz.passed}
                  review={quiz.review}
                  canSubmit={Boolean(enrollment) || isAdmin}
                  signupHref={`/cursos/${slug}`}
                />
              ))}
            {lesson.lesson_attachments.length > 0 && (
              <section className="grid gap-3">
                <h2 className="text-lg font-semibold">Material descargable</h2>
                <ul className="divide-y rounded-lg border">
                  {lesson.lesson_attachments.map((attachment) => (
                    <li key={attachment.id}>
                      <a
                        href={`/api/descargas/${attachment.id}`}
                        className="hover:bg-accent flex items-center gap-3 px-4 py-3 text-sm"
                      >
                        <FileText className="text-muted-foreground size-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{attachment.file_name}</span>
                        <span className="text-muted-foreground shrink-0">{formatBytes(attachment.size_bytes)}</span>
                        <Download className="size-4 shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        <nav className="flex justify-between gap-3 border-t pt-6" aria-label="Lecciones">
          {previous ? (
            <Button asChild variant="outline">
              <Link href={`/cursos/${slug}/lecciones/${previous.id}`}>
                <ChevronLeft /> Anterior
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {next && (
            <Button asChild>
              <Link href={`/cursos/${slug}/lecciones/${next.id}`}>
                Siguiente <ChevronRight />
              </Link>
            </Button>
          )}
        </nav>
      </div>

      <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
        <details className="group rounded-lg border lg:hidden">
          <summary className="cursor-pointer px-4 py-3 font-medium">Contenido del curso</summary>
          <div className="border-t p-3">{sidebar}</div>
        </details>
        <div className="hidden lg:block">{sidebar}</div>
      </aside>
    </div>
  );
}

// Preguntas (sin las respuestas correctas), intentos del alumno y, si ya
// aprobó o agotó los intentos, las respuestas para repasar.
async function loadQuiz(lessonId: string, userId: string | undefined) {
  const supabase = await createClient();
  const [{ data: quiz }, { data: questions }, { data: attempts }, { data: review }] = await Promise.all([
    supabase.from("quizzes").select("passing_score, max_attempts").eq("lesson_id", lessonId).maybeSingle(),
    supabase
      .from("quiz_questions")
      .select("id, type, prompt, position, quiz_options(id, label, position)")
      .eq("lesson_id", lessonId)
      .order("position")
      .order("position", { referencedTable: "quiz_options" }),
    userId
      ? supabase.from("quiz_attempts").select("score, passed").eq("lesson_id", lessonId).eq("user_id", userId)
      : Promise.resolve({ data: [] as { score: number; passed: boolean }[] }),
    userId ? supabase.rpc("quiz_review", { p_lesson_id: lessonId }) : Promise.resolve({ data: null }),
  ]);
  if (!quiz) return null;
  return {
    passingScore: quiz.passing_score,
    maxAttempts: quiz.max_attempts,
    questions: (questions ?? []).map((question) => ({
      id: question.id,
      type: question.type,
      prompt: question.prompt,
      options: question.quiz_options.map((option) => ({ id: option.id, label: option.label })),
    })),
    attemptsUsed: attempts?.length ?? 0,
    bestScore: attempts?.length ? Math.max(...attempts.map((attempt) => attempt.score)) : null,
    passed: Boolean(attempts?.some((attempt) => attempt.passed)),
    review: review ?? null,
  };
}
