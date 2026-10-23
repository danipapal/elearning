import type { CourseLevel, CourseStatus } from "@/types/database";

export const STATUS_LABELS: Record<CourseStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
};

export const STATUS_VARIANTS: Record<CourseStatus, "secondary" | "default" | "outline"> = {
  draft: "secondary",
  published: "default",
  archived: "outline",
};

export const LEVEL_LABELS: Record<CourseLevel, string> = {
  all: "Todos los niveles",
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(iso));
}
