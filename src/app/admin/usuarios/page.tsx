import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Search, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDate } from "@/lib/courses";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/users";
import { parseUserFilters, userFilterParams } from "@/lib/user-filters";

export const metadata: Metadata = { title: "Usuarios" };

const PAGE_SIZE = 25;

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/usuarios">) {
  const params = await searchParams;
  const filters = parseUserFilters(params);
  const page = Math.max(1, Number.parseInt(String(params.pagina ?? "1"), 10) || 1);

  const supabase = await createClient();
  const [{ data: users, error }, { data: courses }] = await Promise.all([
    supabase.rpc("admin_list_users", {
      ...filters.rpc,
      p_limit: PAGE_SIZE,
      p_offset: (page - 1) * PAGE_SIZE,
    }),
    supabase.from("courses").select("id, title").order("title"),
  ]);
  if (error) console.error("[admin] usuarios", error.code, error.message);

  const total = users?.[0]?.total_count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const query = userFilterParams(filters);
  const pageHref = (target: number) => {
    const next = new URLSearchParams(query);
    if (target > 1) next.set("pagina", String(target));
    return `/admin/usuarios${next.size ? `?${next}` : ""}`;
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Usuarios</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/inscripciones">
              <UserPlus /> Inscripción masiva
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/admin/exportar/usuarios${query.size ? `?${query}` : ""}`} download>
              <Download /> Exportar CSV
            </a>
          </Button>
        </div>
      </div>

      {params.mensaje === "eliminado" && (
        <p role="status" className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          La cuenta se eliminó.
        </p>
      )}

      <form className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" role="search">
        <div className="relative sm:col-span-2 lg:col-span-3">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            name="q"
            defaultValue={filters.q}
            placeholder="Buscar por nombre o email"
            aria-label="Buscar por nombre o email"
            className="pl-9"
          />
        </div>
        <NativeSelect name="rol" defaultValue={filters.role ?? ""} aria-label="Rol">
          <option value="">Todos los roles</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="estado" defaultValue={filters.status ?? ""} aria-label="Estado">
          <option value="">Todos los estados</option>
          {Object.entries(USER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="curso" defaultValue={filters.courseId ?? ""} aria-label="Curso">
          <option value="">Cualquier curso</option>
          {courses?.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </NativeSelect>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Registrado desde</span>
          <Input type="date" name="desde" defaultValue={filters.from ?? ""} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Registrado hasta</span>
          <Input type="date" name="hasta" defaultValue={filters.to ?? ""} />
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit" className="flex-1">
            Filtrar
          </Button>
          {query.size > 0 && (
            <Button variant="ghost" asChild>
              <Link href="/admin/usuarios">Limpiar</Link>
            </Button>
          )}
        </div>
      </form>

      <p className="text-muted-foreground text-sm">
        {total === 1 ? "1 usuario" : `${total} usuarios`}
      </p>

      {!users?.length ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">No hay usuarios con esos filtros</p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {users.map((user) => (
            <li key={user.id}>
              <Link href={`/admin/usuarios/${user.id}`} className="hover:bg-muted/50 flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{user.full_name || "Sin nombre"}</p>
                  <p className="text-muted-foreground truncate text-sm">
                    {user.email} · {user.enrollments_count}{" "}
                    {user.enrollments_count === 1 ? "curso" : "cursos"} · alta {formatDate(user.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {!user.email_confirmed_at && <Badge variant="outline">Sin verificar</Badge>}
                  {user.status === "suspended" && <Badge variant="destructive">Suspendido</Badge>}
                  <Badge variant={user.role === "student" ? "secondary" : "default"}>{ROLE_LABELS[user.role]}</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-between gap-3" aria-label="Páginas">
          <Button variant="outline" size="sm" asChild>
            {page > 1 ? (
              <Link href={pageHref(page - 1)}>
                <ChevronLeft /> Anterior
              </Link>
            ) : (
              <span aria-disabled className="pointer-events-none opacity-50">
                <ChevronLeft /> Anterior
              </span>
            )}
          </Button>
          <span className="text-muted-foreground text-sm">
            Página {page} de {pages}
          </span>
          <Button variant="outline" size="sm" asChild>
            {page < pages ? (
              <Link href={pageHref(page + 1)}>
                Siguiente <ChevronRight />
              </Link>
            ) : (
              <span aria-disabled className="pointer-events-none opacity-50">
                Siguiente <ChevronRight />
              </span>
            )}
          </Button>
        </nav>
      )}
    </div>
  );
}
