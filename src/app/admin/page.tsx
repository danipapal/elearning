import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";

import { BarRow, WeekBars } from "@/components/admin/charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, percent } from "@/lib/users";

export const metadata: Metadata = { title: "Administración", robots: { index: false } };

function StatTile({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="grid gap-1 px-4">
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-3xl font-semibold">{value.toLocaleString("es-AR")}</p>
        {note && <p className="text-muted-foreground text-xs">{note}</p>}
      </CardContent>
    </Card>
  );
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const user = await requireAdmin();
  const { curso } = await searchParams;

  const supabase = await createClient();
  const [{ data: stats, error }, { data: courses }, { data: quizStats }] = await Promise.all([
    supabase.rpc("admin_stats"),
    supabase.from("courses").select("id, title").eq("status", "published").order("title"),
    supabase.rpc("admin_quiz_stats"),
  ]);
  if (error) console.error("[admin] estadísticas", error.code, error.message);

  const funnelCourse = courses?.find((course) => course.id === curso) ?? courses?.[0];
  const { data: funnel } = funnelCourse
    ? await supabase.rpc("admin_course_funnel", { p_course_id: funnelCourse.id })
    : { data: null };
  const enrolled = funnel?.[0]?.enrolled ?? 0;
  const topMax = Math.max(0, ...(stats?.top_lessons.map((lesson) => lesson.completed) ?? []));

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">Panel</h1>
          <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
        </div>
        <Button variant="outline" asChild>
          <a href="/admin/exportar/progreso" download>
            <Download /> Exportar progreso
          </a>
        </Button>
      </div>

      {!stats ? (
        <p className="text-destructive text-sm">No se pudieron cargar las estadísticas.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatTile label="Usuarios" value={stats.users_total} note={`+${stats.users_new_7d} en los últimos 7 días`} />
            <StatTile label="Alumnos" value={stats.students_total} />
            <StatTile label="Inscripciones" value={stats.enrollments_total} note={`+${stats.enrollments_7d} en los últimos 7 días`} />
            <StatTile label="Cursos publicados" value={stats.courses_published} />
            <StatTile label="Lecciones completadas" value={stats.lessons_completed} />
            <StatTile label="Cursos terminados" value={stats.courses_completed} note="Alumnos que completaron todas las lecciones" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardContent>
                <WeekBars title="Usuarios nuevos por semana" data={stats.users_by_week} />
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <WeekBars title="Inscripciones por semana" data={stats.enrollments_by_week} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lecciones más completadas</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.top_lessons.length === 0 ? (
                <p className="text-muted-foreground text-sm">Todavía nadie completó lecciones.</p>
              ) : (
                <ol className="grid gap-3">
                  {stats.top_lessons.map((lesson, index) => (
                    <BarRow
                      key={index}
                      label={lesson.lesson}
                      sublabel={lesson.course}
                      value={lesson.completed}
                      max={topMax}
                    />
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {Boolean(quizStats?.length) && (
        <Card>
          <CardHeader>
            <CardTitle>Cuestionarios</CardTitle>
            <CardDescription>Nota promedio de todos los intentos y alumnos que aprobaron.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3">
              {quizStats?.map((quiz) => (
                <BarRow
                  key={quiz.lesson_id}
                  label={quiz.lesson_title}
                  sublabel={quiz.course_title}
                  value={Number(quiz.average_score ?? 0)}
                  max={100}
                  display={
                    quiz.attempts > 0
                      ? `promedio ${quiz.average_score}% · ${quiz.passed_students} de ${quiz.students} aprobaron`
                      : "sin intentos"
                  }
                />
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Avance por lección</CardTitle>
          <CardDescription>
            Cuántos inscritos completaron cada lección. Donde la barra cae de golpe es donde más alumnos abandonan.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {!courses?.length ? (
            <p className="text-muted-foreground text-sm">Todavía no hay cursos publicados.</p>
          ) : (
            <>
              <form className="flex flex-wrap gap-2">
                <NativeSelect name="curso" defaultValue={funnelCourse?.id} aria-label="Curso" className="w-auto max-w-full min-w-56">
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </NativeSelect>
                <Button type="submit" variant="outline">
                  Ver
                </Button>
                {funnelCourse && (
                  <Button variant="ghost" asChild>
                    <a href={`/admin/exportar/progreso?curso=${funnelCourse.id}`} download>
                      <Download /> CSV del curso
                    </a>
                  </Button>
                )}
              </form>
              <p className="text-muted-foreground text-sm">
                {enrolled === 1 ? "1 inscrito" : `${enrolled} inscritos`}
              </p>
              {!funnel?.length ? (
                <p className="text-muted-foreground text-sm">Este curso no tiene lecciones.</p>
              ) : (
                <ol className="grid gap-3">
                  {funnel.map((row) => (
                    <BarRow
                      key={row.lesson_id}
                      label={row.lesson_title}
                      sublabel={row.module_title}
                      value={row.completed}
                      max={enrolled}
                      display={`${row.completed} · ${percent(row.completed, enrolled)}%`}
                    />
                  ))}
                </ol>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-sm">
        Accesos rápidos: <Link href="/admin/cursos" className="underline">cursos</Link>,{" "}
        <Link href="/admin/usuarios" className="underline">usuarios</Link>,{" "}
        <Link href="/admin/inscripciones" className="underline">inscripción masiva</Link> y{" "}
        <Link href="/admin/auditoria" className="underline">auditoría</Link>.
      </p>
    </div>
  );
}
