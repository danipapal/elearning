import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

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
  const { data: courses } = await supabase.rpc("my_learning");

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
    </div>
  );
}
