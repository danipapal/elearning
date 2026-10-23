import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { ENTITY_LABELS, describeAudit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/users";

export const metadata: Metadata = { title: "Auditoría" };

const PAGE_SIZE = 50;

export default async function AuditPage({ searchParams }: PageProps<"/admin/auditoria">) {
  const params = await searchParams;
  const type = typeof params.tipo === "string" && params.tipo in ENTITY_LABELS ? params.tipo : "";
  const page = Math.max(1, Number.parseInt(String(params.pagina ?? "1"), 10) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select("*, actor:profiles(id, full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (type) query = query.eq("entity_type", type);
  const [{ data: entries, count }, { data: courses }] = await Promise.all([
    query,
    supabase.from("courses").select("id, title"),
  ]);
  const courseTitles = new Map((courses ?? []).map((course) => [course.id, course.title]));
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const pageHref = (target: number) => {
    const next = new URLSearchParams();
    if (type) next.set("tipo", type);
    if (target > 1) next.set("pagina", String(target));
    return `/admin/auditoria${next.size ? `?${next}` : ""}`;
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <div>
        <h1 className="text-3xl font-bold">Auditoría</h1>
        <p className="text-muted-foreground mt-1">Quién hizo cada cambio en el panel y cuándo.</p>
      </div>

      <form className="flex flex-wrap gap-2">
        <NativeSelect name="tipo" defaultValue={type} aria-label="Tipo" className="w-auto min-w-48">
          <option value="">Todos los cambios</option>
          {Object.entries(ENTITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {!entries?.length ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">Todavía no hay cambios registrados</p>
        </div>
      ) : (
        <ol className="divide-y rounded-lg border text-sm">
          {entries.map((entry) => {
            const userId = entry.details.user_id;
            return (
              <li key={entry.id} className="grid gap-1 p-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-3">
                <time className="text-muted-foreground" dateTime={entry.created_at}>
                  {formatDateTime(entry.created_at)}
                </time>
                <div className="min-w-0">
                  <p className="break-words">{describeAudit(entry, courseTitles)}</p>
                  <p className="text-muted-foreground text-xs">
                    Por{" "}
                    {entry.actor ? (
                      <Link href={`/admin/usuarios/${entry.actor.id}`} className="hover:underline">
                        {entry.actor.full_name || "admin sin nombre"}
                      </Link>
                    ) : (
                      "una cuenta eliminada"
                    )}
                    {userId && entry.action !== "delete_user" && (
                      <>
                        {" · "}
                        <Link href={`/admin/usuarios/${userId}`} className="hover:underline">
                          ver usuario
                        </Link>
                      </>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
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
