"use client";

import Link from "next/link";
import { Archive, ArchiveRestore, Copy, Eye, EyeOff, Send, Trash2 } from "lucide-react";

import { deleteCourse, duplicateCourse, setCourseStatus } from "@/app/admin/cursos/actions";
import { ActionButton } from "@/components/admin/action-button";
import { Button } from "@/components/ui/button";
import type { CourseStatus } from "@/types/database";

export function CourseActions({
  courseId,
  slug,
  status,
}: {
  courseId: string;
  slug: string;
  status: CourseStatus;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href={`/cursos/${slug}`} target="_blank">
          <Eye /> Ver como alumno
        </Link>
      </Button>
      {status === "draft" && (
        <ActionButton
          size="sm"
          action={() => setCourseStatus(courseId, "published")}
          confirmMessage="¿Publicar el curso? Va a quedar visible en el catálogo."
        >
          <Send /> Publicar
        </ActionButton>
      )}
      {status === "published" && (
        <ActionButton
          size="sm"
          variant="outline"
          action={() => setCourseStatus(courseId, "draft")}
          confirmMessage="¿Despublicar el curso? Deja de verse en el catálogo."
        >
          <EyeOff /> Despublicar
        </ActionButton>
      )}
      {status !== "archived" ? (
        <ActionButton
          size="sm"
          variant="outline"
          action={() => setCourseStatus(courseId, "archived")}
          confirmMessage="¿Archivar el curso? Deja de verse en el catálogo."
        >
          <Archive /> Archivar
        </ActionButton>
      ) : (
        <ActionButton size="sm" variant="outline" action={() => setCourseStatus(courseId, "draft")}>
          <ArchiveRestore /> Restaurar como borrador
        </ActionButton>
      )}
      <ActionButton
        size="sm"
        variant="outline"
        action={() => duplicateCourse(courseId)}
        confirmMessage="¿Duplicar el curso con todo su temario? La copia queda como borrador."
      >
        <Copy /> Duplicar
      </ActionButton>
      {status !== "published" && (
        <ActionButton
          size="sm"
          variant="ghost"
          className="text-destructive"
          action={() => deleteCourse(courseId)}
          confirmMessage="¿Eliminar el curso con todos sus módulos, lecciones y archivos? No se puede deshacer."
        >
          <Trash2 /> Eliminar
        </ActionButton>
      )}
    </div>
  );
}
