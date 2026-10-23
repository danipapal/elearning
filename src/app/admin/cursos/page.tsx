import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS, STATUS_VARIANTS, formatDate } from "@/lib/courses";
import { coverUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Cursos" };

export default async function AdminCoursesPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, slug, status, cover_path, updated_at, categories(name), modules(lessons(count)), enrollments(count)")
    .order("updated_at", { ascending: false });

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Cursos</h1>
        <Button asChild>
          <Link href="/admin/cursos/nuevo">
            <Plus /> Nuevo curso
          </Link>
        </Button>
      </div>

      {!courses?.length ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">Todavía no hay cursos</p>
          <p className="text-muted-foreground mt-1 text-sm">Creá el primero para empezar.</p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {courses.map((course) => {
            const lessons = course.modules.reduce(
              (total, module) => total + (module.lessons[0]?.count ?? 0),
              0,
            );
            const cover = coverUrl(course.cover_path);
            return (
              <li key={course.id}>
                <Link
                  href={`/admin/cursos/${course.id}`}
                  className="hover:bg-muted/50 flex items-center gap-4 p-3"
                >
                  <div className="bg-muted relative hidden aspect-video w-28 shrink-0 overflow-hidden rounded sm:block">
                    {cover && <Image src={cover} alt="" fill sizes="112px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{course.title}</p>
                    <p className="text-muted-foreground truncate text-sm">
                      {[
                        course.categories?.name,
                        `${course.modules.length} módulos`,
                        `${lessons} lecciones`,
                        `${course.enrollments[0]?.count ?? 0} inscritos`,
                        `actualizado ${formatDate(course.updated_at)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANTS[course.status]}>{STATUS_LABELS[course.status]}</Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
