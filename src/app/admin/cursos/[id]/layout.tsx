import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_VARIANTS } from "@/lib/courses";
import { createClient } from "@/lib/supabase/server";

import { CourseActions } from "./course-actions";
import { CourseTabs } from "./course-tabs";

export default async function CourseLayout({ children, params }: LayoutProps<"/admin/cursos/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, status")
    .eq("id", id)
    .maybeSingle();
  if (!course) notFound();

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid grid-cols-1 gap-3">
        <Link
          href="/admin/cursos"
          className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" /> Cursos
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold break-words sm:text-3xl">{course.title}</h1>
            <Badge variant={STATUS_VARIANTS[course.status]}>{STATUS_LABELS[course.status]}</Badge>
          </div>
          <CourseActions courseId={course.id} status={course.status} />
        </div>
        <CourseTabs courseId={course.id} />
      </div>
      {children}
    </div>
  );
}
