import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CoverUpload } from "@/components/admin/cover-upload";
import { coverUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

import { CourseForm } from "./course-form";

export const metadata: Metadata = { title: "Editar curso" };

export default async function EditCoursePage({ params }: PageProps<"/admin/cursos/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: course }, { data: categories }, { data: instructors }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name").order("name"),
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("role", ["instructor", "admin", "superadmin"])
      .eq("status", "active")
      .order("full_name"),
  ]);
  if (!course) notFound();

  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Portada</h2>
        <CoverUpload courseId={course.id} coverUrl={coverUrl(course.cover_path)} />
      </section>
      <CourseForm
        course={course}
        categories={categories ?? []}
        instructors={(instructors ?? []).map((p) => ({ id: p.id, name: p.full_name || "Sin nombre" }))}
      />
    </div>
  );
}
