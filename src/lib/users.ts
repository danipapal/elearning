import type { EnrollmentSource, EnrollmentStatus, UserRole, UserStatus } from "@/types/database";

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: "Superadministrador",
  admin: "Administrador",
  instructor: "Instructor",
  student: "Alumno",
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: "Activo",
  suspended: "Suspendido",
};

export const SOURCE_LABELS: Record<EnrollmentSource, string> = {
  free: "Gratis",
  manual: "Manual",
  purchase: "Compra",
  subscription: "Suscripción",
};

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  active: "Activa",
  cancelled: "Cancelada",
  expired: "Vencida",
};

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(iso));
}

export function isExpired(expiresAt: string | null) {
  return expiresAt !== null && new Date(expiresAt) <= new Date();
}

export function percent(done: number, total: number) {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

// CSV compatible con Excel (separador ";" y BOM para los acentos). Las celdas
// que empiezan con = + - @ se prefijan para que Excel no las ejecute como fórmula.
export function toCsv(rows: (string | number | null | undefined)[][]) {
  const cell = (value: string | number | null | undefined) => {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[";\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return "﻿" + rows.map((row) => row.map(cell).join(";")).join("\r\n");
}

export function csvResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
