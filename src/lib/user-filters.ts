import { z } from "zod";

import type { UserRole, UserStatus } from "@/types/database";

type Params = Record<string, string | string[] | undefined>;

const roleSchema = z.enum(["superadmin", "admin", "instructor", "student"]);
const statusSchema = z.enum(["active", "suspended"]);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function param(params: Params, key: string) {
  const value = params[key];
  return ((Array.isArray(value) ? value[0] : value) ?? "").trim();
}

// Filtros del listado de usuarios, validados. Se comparten con la exportación.
export function parseUserFilters(params: Params) {
  const q = param(params, "q").slice(0, 100);
  const role = roleSchema.safeParse(param(params, "rol")).data as UserRole | undefined;
  const status = statusSchema.safeParse(param(params, "estado")).data as UserStatus | undefined;
  const courseId = z.guid().safeParse(param(params, "curso")).data;
  const from = dateSchema.safeParse(param(params, "desde")).data;
  const to = dateSchema.safeParse(param(params, "hasta")).data;
  return {
    q,
    role,
    status,
    courseId,
    from,
    to,
    rpc: {
      p_search: q || null,
      p_role: role ?? null,
      p_status: status ?? null,
      p_course_id: courseId ?? null,
      p_from: from ?? null,
      p_to: to ?? null,
    },
  };
}

export function userFilterParams(filters: ReturnType<typeof parseUserFilters>) {
  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.role) query.set("rol", filters.role);
  if (filters.status) query.set("estado", filters.status);
  if (filters.courseId) query.set("curso", filters.courseId);
  if (filters.from) query.set("desde", filters.from);
  if (filters.to) query.set("hasta", filters.to);
  return query;
}
