import { z } from "zod";
import type { NextRequest } from "next/server";

import { getCurrentUser, isAdminRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  ENROLLMENT_STATUS_LABELS,
  SOURCE_LABELS,
  csvResponse,
  formatDateTime,
  isExpired,
  percent,
  toCsv,
} from "@/lib/users";

// Exporta el progreso de cada alumno en cada curso. ?curso=<id> o ?usuario=<id> para filtrar.
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role)) return new Response("No autorizado", { status: 403 });

  const params = request.nextUrl.searchParams;
  const courseId = z.guid().safeParse(params.get("curso")).data ?? null;
  const userId = z.guid().safeParse(params.get("usuario")).data ?? null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_enrollment_progress", {
    p_course_id: courseId,
    p_user_id: userId,
  });
  if (error) {
    console.error("[admin] exportar progreso", error.code, error.message);
    return new Response("No se pudo exportar", { status: 500 });
  }

  const rows = [
    ["Nombre", "Email", "Curso", "Origen", "Estado", "Inscripción", "Vence", "Lecciones completadas", "Total lecciones", "Progreso %", "Último acceso"],
    ...data.map((row) => [
      row.full_name,
      row.email,
      row.course_title,
      SOURCE_LABELS[row.source],
      isExpired(row.expires_at) ? "Vencida" : ENROLLMENT_STATUS_LABELS[row.status],
      formatDateTime(row.enrolled_at),
      row.expires_at ? formatDateTime(row.expires_at) : "",
      row.completed_lessons,
      row.total_lessons,
      percent(row.completed_lessons, row.total_lessons),
      row.last_accessed_at ? formatDateTime(row.last_accessed_at) : "",
    ]),
  ];
  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(`progreso-${date}.csv`, toCsv(rows));
}
