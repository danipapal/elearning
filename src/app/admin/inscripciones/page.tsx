import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { BulkEnrollForm } from "@/components/admin/enroll-forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inscripción masiva" };

export default async function BulkEnrollPage({ searchParams }: PageProps<"/admin/inscripciones">) {
  const { curso } = await searchParams;
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, status")
    .neq("status", "archived")
    .order("title");

  return (
    <div className="grid grid-cols-1 gap-6">
      <Link href="/admin/usuarios" className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm">
        <ArrowLeft className="size-4" /> Usuarios
      </Link>
      <div>
        <h1 className="text-3xl font-bold">Inscripción masiva</h1>
        <p className="text-muted-foreground mt-1">
          Inscribí de una vez a varios usuarios que ya tienen cuenta. Si alguno ya estaba inscrito, se reactiva y se
          actualiza el vencimiento.
        </p>
      </div>
      <BulkEnrollForm courses={courses ?? []} defaultCourseId={typeof curso === "string" ? curso : undefined} />
    </div>
  );
}
