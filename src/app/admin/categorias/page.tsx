import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";

import { CategoryManager } from "./category-manager";

export const metadata: Metadata = { title: "Categorías" };

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, courses(count)")
    .order("name");

  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <h1 className="text-3xl font-bold">Categorías</h1>
        <p className="text-muted-foreground mt-1">Sirven para filtrar el catálogo de cursos.</p>
      </div>
      <CategoryManager
        categories={(categories ?? []).map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          courses: category.courses[0]?.count ?? 0,
        }))}
      />
    </div>
  );
}
