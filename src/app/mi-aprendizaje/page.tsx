import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Award, GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { coverUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mi aprendizaje" };

export default async function MyLearningPage({ searchParams }: PageProps<"/mi-aprendizaje">) {
  const user = await requireUser("/mi-aprendizaje");
  const { password } = await searchParams;
  const firstName = user.fullName.split(" ")[0];

  const supabase = await createClient();
  const [{ data: courses }, { data: certificates }] = await Promise.all([
    supabase.rpc("my_learning"),
    supabase
      .from("certificates")
      .select("code, course_id, course_title, issued_at")
      .eq("user_id", user.id)
      .order("issued_at", { ascending: false }),
  ]);

  const certificateByCourse = new Map(certificates?.map((item) => [item.course_id, item.code]));

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-12">
      {password === "actualizada" && (
        <p role="status" className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          Tu contraseña se actualizó correctamente.
        </p>
      )}
      <div>
        <h1 className="text-3xl font-bold">Hola{firstName ? `, ${firstName}` : ""} 👋</h1>
        <p className="text-muted-foreground mt-1">Este es tu panel de aprendizaje.</p>
      </div>

      {courses?.length ? (
        <ul className="grid gap-4">
          {courses.map((course) => {
            const total = Number(course.total_lessons);
            const done = Number(course.completed_lessons);
            const progress = total ? Math.round((done / total) * 100) : 0;
            const cover = coverUrl(course.cover_path);
            const href = course.last_lesson_id
              ? `/cursos/${course.slug}/lecciones/${course.last_lesson_id}`
              : `/cursos/${course.slug}`;
            return (
              <li key={course.course_id} className="bg-card flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
                <Link
                  href={`/cursos/${course.slug}`}
                  className="bg-muted relative aspect-video w-full shrink-0 overflow-hidden rounded-lg sm:w-48"
                >
                  {cover ? (
                    <Image src={cover} alt="" fill sizes="(min-width: 640px) 192px, 100vw" className="object-cover" />
                  ) : (
                    <GraduationCap className="text-muted-foreground absolute inset-0 m-auto size-8" />
                  )}
                </Link>
                <div className="grid min-w-0 flex-1 gap-2">
                  <Link href={`/cursos/${course.slug}`} className="font-semibold hover:underline">
                    {course.title}
                  </Link>
                  <div className="grid gap-1">
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div className="bg-primary h-full" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {progress === 100 ? "¡Curso completado! 🎉" : `${done} de ${total} lecciones · ${progress}%`}
                    </p>
                  </div>
                </div>
                {certificateByCourse.has(course.course_id) && (
                  <Button asChild variant="default">
                    <Link href={`/certificados/${certificateByCourse.get(course.course_id)}`}>
                      <Award /> Certificado
                    </Link>
                  </Button>
                )}
                <Button asChild variant={progress === 100 ? "outline" : "default"}>
                  <Link href={href}>
                    {progress === 100 ? "Repasar" : done > 0 || course.last_lesson_id ? "Continuar donde lo dejé" : "Empezar"}
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Todavía no estás inscrito en ningún curso</CardTitle>
            <CardDescription>Cuando te inscribas vas a ver acá tus cursos con su progreso.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/cursos">Explorar cursos</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {Boolean(certificates?.length) && (
        <section className="grid gap-3">
          <h2 className="text-xl font-semibold">Mis certificados</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {certificates?.map((certificate) => (
              <li key={certificate.code}>
                <Link
                  href={`/certificados/${certificate.code}`}
                  className="bg-card hover:border-primary flex items-center gap-3 rounded-xl border p-4 transition-colors"
                >
                  <Award className="text-primary size-8 shrink-0" />
                  <span className="grid min-w-0">
                    <span className="truncate font-medium">{certificate.course_title}</span>
                    <span className="text-muted-foreground text-xs">
                      {new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(certificate.issued_at))} ·{" "}
                      {certificate.code}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
