import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { z } from "zod";

import { EnrollUserForm } from "@/components/admin/enroll-forms";
import { UnenrollButton, UserActions } from "@/components/admin/user-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { describeAudit } from "@/lib/audit";
import {
  ENROLLMENT_STATUS_LABELS,
  ROLE_LABELS,
  SOURCE_LABELS,
  USER_STATUS_LABELS,
  formatDateTime,
  isExpired,
  percent,
} from "@/lib/users";

export const metadata: Metadata = { title: "Usuario" };

export default async function AdminUserPage({ params }: PageProps<"/admin/usuarios/[id]">) {
  const { id } = await params;
  if (!z.guid().safeParse(id).success) notFound();
  const admin = await requireAdmin();

  const supabase = await createClient();
  const [
    { data: users },
    { data: enrollments },
    { data: activity },
    { data: audit },
    { data: courses },
    { data: quizzes },
    { data: certificates },
  ] = await Promise.all([
      supabase.rpc("admin_get_user", { p_user_id: id }),
      supabase.rpc("admin_enrollment_progress", { p_user_id: id }),
      supabase.rpc("admin_user_activity", { p_user_id: id, p_limit: 20 }),
      supabase
        .from("audit_log")
        .select("*, actor:profiles(full_name)")
        .or(`entity_id.eq.${id},details->>user_id.eq.${id}`)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("courses").select("id, title, status").neq("status", "archived").order("title"),
      supabase.rpc("admin_user_quizzes", { p_user_id: id }),
      supabase
        .from("certificates")
        .select("code, course_title, issued_at")
        .eq("user_id", id)
        .order("issued_at", { ascending: false }),
    ]);
  const user = users?.[0];
  if (!user) notFound();

  const isSelf = user.id === admin.id;
  const targetIsAdmin = user.role === "admin" || user.role === "superadmin";
  const isSuperadmin = admin.role === "superadmin";
  const canManage = !isSelf && (isSuperadmin || !targetIsAdmin);
  const name = user.full_name || user.email;

  const courseTitles = new Map(
    [...(courses ?? []), ...(enrollments ?? []).map((row) => ({ id: row.course_id, title: row.course_title }))].map(
      (course) => [course.id, course.title],
    ),
  );

  // Historial combinado: lecciones completadas y cambios hechos por admins.
  const history = [
    ...(activity ?? []).map((row) => ({
      at: row.completed_at,
      text: `Completó "${row.lesson_title}" (${row.course_title})`,
    })),
    ...(audit ?? []).map((row) => ({
      at: row.created_at,
      text: `${describeAudit(row, courseTitles)} — por ${row.actor?.full_name || "un admin"}`,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 25);

  return (
    <div className="grid grid-cols-1 gap-6">
      <Link href="/admin/usuarios" className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm">
        <ArrowLeft className="size-4" /> Usuarios
      </Link>

      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold break-all">{user.full_name || "Sin nombre"}</h1>
          <Badge variant={user.role === "student" ? "secondary" : "default"}>{ROLE_LABELS[user.role]}</Badge>
          {user.status === "suspended" && <Badge variant="destructive">{USER_STATUS_LABELS.suspended}</Badge>}
          {!user.email_confirmed_at && <Badge variant="outline">Email sin verificar</Badge>}
        </div>
        <p className="text-muted-foreground break-all">{user.email}</p>
        <p className="text-muted-foreground text-sm">
          Registrado {formatDateTime(user.created_at)} · Último ingreso{" "}
          {user.last_sign_in_at ? formatDateTime(user.last_sign_in_at) : "nunca"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acciones</CardTitle>
        </CardHeader>
        <CardContent>
          <UserActions
            userId={user.id}
            name={name}
            role={user.role}
            status={user.status}
            emailConfirmed={Boolean(user.email_confirmed_at)}
            canManage={canManage}
            canGrantAdmin={isSuperadmin}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Cursos</CardTitle>
          {Boolean(enrollments?.length) && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/admin/exportar/progreso?usuario=${user.id}`} download>
                <Download /> Exportar progreso
              </a>
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-6">
          {!enrollments?.length ? (
            <p className="text-muted-foreground text-sm">No está inscrito en ningún curso.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {enrollments.map((row) => {
                const pct = percent(row.completed_lessons, row.total_lessons);
                const expired = isExpired(row.expires_at);
                return (
                  <li key={row.enrollment_id} className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="grid min-w-0 gap-1">
                      <Link href={`/admin/cursos/${row.course_id}`} className="truncate font-medium hover:underline">
                        {row.course_title}
                      </Link>
                      <p className="text-muted-foreground text-xs">
                        {SOURCE_LABELS[row.source]} · desde {formatDateTime(row.enrolled_at)}
                        {row.expires_at && ` · ${expired ? "venció" : "vence"} ${formatDateTime(row.expires_at)}`}
                        {row.last_accessed_at && ` · último acceso ${formatDateTime(row.last_accessed_at)}`}
                      </p>
                      <div className="flex items-center gap-2">
                        <div
                          className="bg-muted h-2 flex-1 overflow-hidden rounded-full"
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Progreso en ${row.course_title}`}
                        >
                          <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-muted-foreground w-28 text-right text-xs">
                          {row.completed_lessons}/{row.total_lessons} · {pct}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      {(expired || row.status !== "active") && (
                        <Badge variant="outline">{expired ? "Vencida" : ENROLLMENT_STATUS_LABELS[row.status]}</Badge>
                      )}
                      <UnenrollButton enrollmentId={row.enrollment_id} courseTitle={row.course_title} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="grid gap-2">
            <h3 className="font-medium">Inscribir en un curso</h3>
            <p className="text-muted-foreground text-sm">
              Si ya estaba inscrito, se reactiva y se actualiza el vencimiento.
            </p>
            <EnrollUserForm userId={user.id} courses={courses ?? []} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cuestionarios y certificados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          {!quizzes?.length ? (
            <p className="text-muted-foreground text-sm">Todavía no respondió ningún cuestionario.</p>
          ) : (
            <ul className="divide-y rounded-lg border text-sm">
              {quizzes.map((quiz) => (
                <li key={quiz.lesson_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0">
                    <span className="font-medium">{quiz.lesson_title}</span>
                    <span className="text-muted-foreground"> · {quiz.course_title}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {quiz.attempts} {quiz.attempts === 1 ? "intento" : "intentos"} · mejor nota {quiz.best_score}%
                    </span>
                    <Badge variant={quiz.passed ? "default" : "outline"}>{quiz.passed ? "Aprobado" : "No aprobado"}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {certificates?.length ? (
            <ul className="grid gap-2 text-sm">
              {certificates.map((certificate) => (
                <li key={certificate.code} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Certificado de <strong>{certificate.course_title}</strong> ·{" "}
                    <span className="text-muted-foreground">{formatDateTime(certificate.issued_at)}</span>
                  </span>
                  <a
                    href={`/certificados/${certificate.code}/pdf`}
                    target="_blank"
                    rel="noopener"
                    className="font-mono text-xs hover:underline"
                  >
                    {certificate.code}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">Todavía no tiene certificados.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-sm">Todavía no hay actividad.</p>
          ) : (
            <ol className="grid gap-2 text-sm">
              {history.map((item, index) => (
                <li key={index} className="grid gap-0.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-3">
                  <time className="text-muted-foreground" dateTime={item.at}>
                    {formatDateTime(item.at)}
                  </time>
                  <span className="break-words">{item.text}</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
