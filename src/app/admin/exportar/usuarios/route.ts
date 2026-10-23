import type { NextRequest } from "next/server";

import { getCurrentUser, isAdminRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseUserFilters } from "@/lib/user-filters";
import { ROLE_LABELS, USER_STATUS_LABELS, csvResponse, formatDateTime, toCsv } from "@/lib/users";

// Exporta los usuarios (con los mismos filtros del listado) a CSV.
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role)) return new Response("No autorizado", { status: 403 });

  const filters = parseUserFilters(Object.fromEntries(request.nextUrl.searchParams));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_users", { ...filters.rpc, p_limit: 5000 });
  if (error) {
    console.error("[admin] exportar usuarios", error.code, error.message);
    return new Response("No se pudo exportar", { status: 500 });
  }

  const rows = [
    ["Nombre", "Email", "Rol", "Estado", "Email verificado", "Registrado", "Último ingreso", "Cursos"],
    ...data.map((row) => [
      row.full_name,
      row.email,
      ROLE_LABELS[row.role],
      USER_STATUS_LABELS[row.status],
      row.email_confirmed_at ? "Sí" : "No",
      formatDateTime(row.created_at),
      row.last_sign_in_at ? formatDateTime(row.last_sign_in_at) : "",
      row.enrollments_count,
    ]),
  ];
  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(`usuarios-${date}.csv`, toCsv(rows));
}
