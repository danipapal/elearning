import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { CourseCard } from "@/components/course-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { LEVEL_LABELS } from "@/lib/courses";
import { createClient } from "@/lib/supabase/server";
import type { CourseLevel } from "@/types/database";

export const metadata: Metadata = {
  title: "Cursos",
  description: "Catálogo de cursos online. Registrate gratis y empezá a aprender.",
};

function param(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function CoursesPage({ searchParams }: PageProps<"/cursos">) {
  const params = await searchParams;
  // Se quitan caracteres con significado especial en los filtros de PostgREST.
  const q = param(params.q).replace(/[%_,()*\\:."]/g, " ").slice(0, 80).trim();
  const categorySlug = param(params.categoria);
  const level = param(params.nivel);

  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("id, name, slug").order("name");
  const category = categories?.find((item) => item.slug === categorySlug);

  let query = supabase
    .from("courses")
    .select("slug, title, short_description, cover_path, level, categories(name)")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (q) query = query.or(`title.ilike.%${q}%,short_description.ilike.%${q}%`);
  if (category) query = query.eq("category_id", category.id);
  if (level in LEVEL_LABELS) query = query.eq("level", level as CourseLevel);
  const { data: courses } = await query;

  const filtered = Boolean(q || category || level);

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 py-12">
      <div>
        <h1 className="text-3xl font-bold">Cursos</h1>
        <p className="text-muted-foreground mt-1">Elegí un curso y empezá hoy, gratis.</p>
      </div>

      <form className="grid gap-3 sm:grid-cols-[1fr_12rem_12rem_auto]" role="search">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Buscar cursos"
            aria-label="Buscar cursos"
            className="pl-9"
          />
        </div>
        <NativeSelect name="categoria" defaultValue={category?.slug ?? ""} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {categories?.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="nivel" defaultValue={level in LEVEL_LABELS ? level : ""} aria-label="Nivel">
          <option value="">Todos los niveles</option>
          {Object.entries(LEVEL_LABELS)
            .filter(([value]) => value !== "all")
            .map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
        </NativeSelect>
        <Button type="submit">Buscar</Button>
      </form>

      {courses?.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.slug} course={course} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">
            {filtered ? "No encontramos cursos con esos filtros." : "Muy pronto vas a encontrar cursos acá."}
          </p>
          {filtered && (
            <Link href="/cursos" className="text-primary mt-2 inline-block text-sm hover:underline">
              Ver todos los cursos
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
