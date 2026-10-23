import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, CheckCircle2, Clock, GraduationCap, Signal, User } from "lucide-react";

import { CourseOutline } from "@/components/course/course-outline";
import { EnrollButton } from "@/components/course/enroll-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VideoEmbed } from "@/components/video-embed";
import { getCurrentUser, isAdminRole } from "@/lib/auth";
import { formatTotalDuration, getCourseBySlug, getEnrollment, getOutline } from "@/lib/catalog";
import { LEVEL_LABELS, STATUS_LABELS } from "@/lib/courses";
import { sanitizeRichText } from "@/lib/sanitize";
import { coverUrl } from "@/lib/storage";
import { publicEnv } from "@/lib/env";
import { getSiteSettings } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/cursos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return { title: "Curso no encontrado" };
  const cover = coverUrl(course.cover_path);
  return {
    title: course.title,
    description: course.short_description || undefined,
    alternates: { canonical: `/cursos/${course.slug}` },
    openGraph: {
      title: course.title,
      description: course.short_description || undefined,
      // Sin portada, la imagen general del sitio.
      images: cover ? [{ url: cover, width: 1280, height: 720 }] : ["/opengraph-image"],
    },
    robots: course.status === "published" ? undefined : { index: false },
  };
}

export default async function CoursePage({ params }: PageProps<"/cursos/[slug]">) {
  const { slug } = await params;
  const [course, user] = await Promise.all([getCourseBySlug(slug), getCurrentUser()]);
  if (!course) notFound();

  const isAdmin = Boolean(user && isAdminRole(user.role));
  const supabase = await createClient();
  const [outline, enrollment, { data: instructors }] = await Promise.all([
    getOutline(course.id, isAdmin),
    user ? getEnrollment(course.id, user.id) : null,
    supabase.rpc("course_instructor", { p_course_id: course.id }),
  ]);
  const instructor = instructors?.[0];
  const duration = formatTotalDuration(outline.totalSeconds);
  const cover = coverUrl(course.cover_path);
  const firstAccessible = outline.lessons.find((lesson) => lesson.accessible);
  const continueId =
    (enrollment?.last_lesson_id &&
      outline.lessons.find((lesson) => lesson.id === enrollment.last_lesson_id && lesson.accessible)?.id) ||
    outline.lessons.find((lesson) => lesson.accessible && !lesson.completed)?.id ||
    firstAccessible?.id;
  const description = sanitizeRichText(course.description);
  const progress = outline.lessons.length
    ? Math.round((outline.completedCount / outline.lessons.length) * 100)
    : 0;

  // Datos estructurados para Google (schema.org/Course).
  const settings = await getSiteSettings();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.short_description || course.title,
    url: `${publicEnv.NEXT_PUBLIC_SITE_URL}/cursos/${course.slug}`,
    inLanguage: "es",
    ...(cover ? { image: cover } : {}),
    provider: { "@type": "Organization", name: settings.site_name, sameAs: publicEnv.NEXT_PUBLIC_SITE_URL },
    ...(course.access_type === "free"
      ? { isAccessibleForFree: true, offers: { "@type": "Offer", price: 0, priceCurrency: "ARS", category: "Free" } }
      : {}),
  };

  return (
    <div className="pb-16">
      {course.status === "published" && (
        <script
          type="application/ld+json"
          // Se escapa "<" para que el texto no pueda cerrar la etiqueta.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      {course.status !== "published" && (
        <div className="bg-amber-500/15 px-4 py-2 text-center text-sm text-amber-800 dark:text-amber-300">
          Este curso está en estado <strong>{STATUS_LABELS[course.status].toLowerCase()}</strong>: solo
          los administradores lo ven.
        </div>
      )}
      <section className="bg-muted/40 border-b">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_24rem] lg:py-14">
          <div className="grid content-start gap-4">
            <div className="flex flex-wrap gap-2">
              {course.categories && (
                <Link href={`/cursos?categoria=${course.categories.slug}`}>
                  <Badge variant="secondary">{course.categories.name}</Badge>
                </Link>
              )}
              <Badge variant="outline">{LEVEL_LABELS[course.level]}</Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{course.title}</h1>
            {course.short_description && (
              <p className="text-muted-foreground text-lg">{course.short_description}</p>
            )}
            <ul className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {instructor && (
                <li className="flex items-center gap-1.5">
                  <User className="size-4" /> {instructor.full_name}
                </li>
              )}
              <li className="flex items-center gap-1.5">
                <BookOpen className="size-4" /> {outline.lessons.length} lecciones
              </li>
              {duration && (
                <li className="flex items-center gap-1.5">
                  <Clock className="size-4" /> {duration}
                </li>
              )}
              <li className="flex items-center gap-1.5">
                <Signal className="size-4" /> {LEVEL_LABELS[course.level]}
              </li>
            </ul>
          </div>

          <aside className="bg-card grid content-start gap-4 overflow-hidden rounded-xl border shadow-sm lg:row-span-2">
            {course.intro_video_url ? (
              <VideoEmbed url={course.intro_video_url} title={`Presentación de ${course.title}`} />
            ) : cover ? (
              <div className="relative aspect-video">
                <Image src={cover} alt="" fill priority sizes="384px" className="object-cover" />
              </div>
            ) : (
              <div className="bg-muted text-muted-foreground flex aspect-video items-center justify-center">
                <GraduationCap className="size-12" />
              </div>
            )}
            <div className="grid gap-3 px-5 pb-5">
              {enrollment ? (
                <>
                  <div className="grid gap-1.5">
                    <div className="flex justify-between text-sm">
                      <span>Tu progreso</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div className="bg-primary h-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  {continueId && (
                    <Button asChild size="lg" className="w-full">
                      <Link href={`/cursos/${course.slug}/lecciones/${continueId}`}>
                        {outline.completedCount > 0 ? "Continuar donde lo dejé" : "Empezar el curso"}
                      </Link>
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold">Gratis</p>
                  {user ? (
                    <EnrollButton courseId={course.id} slug={course.slug} />
                  ) : (
                    <Button asChild size="lg" className="w-full">
                      <Link href={`/login?next=${encodeURIComponent(`/cursos/${course.slug}`)}`}>
                        Inscribirme gratis
                      </Link>
                    </Button>
                  )}
                  {!user && (
                    <p className="text-muted-foreground text-center text-xs">
                      ¿No tenés cuenta?{" "}
                      <Link href="/registro" className="text-primary hover:underline">
                        Registrate gratis
                      </Link>
                    </p>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-10 lg:grid-cols-[1fr_24rem]">
        <div className="grid min-w-0 content-start gap-10">
          {course.learning_objectives.length > 0 && (
            <section className="rounded-xl border p-6">
              <h2 className="mb-4 text-xl font-semibold">Lo que vas a aprender</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {course.learning_objectives.map((item) => (
                  <li key={item} className="flex gap-2 text-sm">
                    <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="grid gap-4">
            <h2 className="text-xl font-semibold">Temario</h2>
            {outline.modules.length ? (
              <CourseOutline modules={outline.modules} slug={course.slug} showProgress={Boolean(enrollment)} />
            ) : (
              <p className="text-muted-foreground text-sm">El temario se publicará pronto.</p>
            )}
          </section>

          {description && (
            <section className="grid gap-3">
              <h2 className="text-xl font-semibold">Descripción</h2>
              <div className="prose-content" dangerouslySetInnerHTML={{ __html: description }} />
            </section>
          )}

          {course.requirements.length > 0 && (
            <section className="grid gap-3">
              <h2 className="text-xl font-semibold">Requisitos</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {course.requirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {course.faqs.length > 0 && (
            <section className="grid gap-3">
              <h2 className="text-xl font-semibold">Preguntas frecuentes</h2>
              <div className="divide-y rounded-lg border">
                {course.faqs.map((faq) => (
                  <details key={faq.question} className="group px-4 py-3">
                    <summary className="cursor-pointer font-medium marker:content-none">
                      <span className="flex items-center justify-between gap-3">
                        {faq.question}
                        <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                      </span>
                    </summary>
                    <p className="text-muted-foreground mt-2 text-sm whitespace-pre-line">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
