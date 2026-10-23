import { ROLE_LABELS } from "@/lib/users";
import type { AuditEntry } from "@/types/database";

export const ENTITY_LABELS: Record<string, string> = {
  categories: "Categoría",
  courses: "Curso",
  modules: "Módulo",
  lessons: "Lección",
  lesson_attachments: "Material",
  enrollments: "Inscripción",
  profiles: "Usuario",
};

const FIELD_LABELS: Record<string, string> = {
  title: "título",
  name: "nombre",
  slug: "URL",
  status: "estado",
  role: "rol",
  full_name: "nombre",
  description: "descripción",
  short_description: "descripción corta",
  cover_path: "portada",
  intro_video_url: "video de presentación",
  intro_video_provider: "video de presentación",
  category_id: "categoría",
  level: "nivel",
  requirements: "requisitos",
  learning_objectives: "objetivos",
  faqs: "preguntas frecuentes",
  access_type: "tipo de acceso",
  published_at: "publicación",
  release_after_days: "liberación",
  video_url: "video",
  video_provider: "video",
  duration_seconds: "duración",
  content: "contenido",
  is_preview: "vista previa",
  type: "tipo",
  expires_at: "vencimiento",
  source: "origen",
  module_id: "módulo",
};

// Frase legible para una entrada del registro de auditoría.
// courseTitles permite nombrar el curso en las inscripciones.
export function describeAudit(
  entry: Pick<AuditEntry, "action" | "entity_type" | "summary" | "details">,
  courseTitles?: Map<string, string>,
) {
  const { action, entity_type: type, summary, details } = entry;
  const name = summary ? ` "${summary}"` : "";

  if (type === "profiles") {
    if (action === "delete_user") return `Eliminó la cuenta${name}${details.email ? ` (${details.email})` : ""}`;
    if (details.from && details.to) {
      if (details.from.role !== details.to.role) {
        return `Cambió el rol de${name} de ${ROLE_LABELS[details.from.role]} a ${ROLE_LABELS[details.to.role]}`;
      }
      if (details.from.status !== details.to.status) {
        return details.to.status === "suspended"
          ? `Suspendió la cuenta de${name}`
          : `Reactivó la cuenta de${name}`;
      }
    }
    return `Editó el perfil de${name}`;
  }

  if (type === "enrollments") {
    const title = details.course_id ? courseTitles?.get(details.course_id) : undefined;
    const course = title ? ` "${title}"` : " un curso";
    if (action === "insert") return `Inscribió en${course}`;
    if (action === "delete") return `Dio de baja de${course}`;
    return `Modificó la inscripción en${course}`;
  }

  const label = ENTITY_LABELS[type] ?? type;
  if (action === "insert") return `Creó ${label.toLowerCase()}${name}`;
  if (action === "delete") return `Eliminó ${label.toLowerCase()}${name}`;
  const fields = [...new Set((details.changed ?? []).map((field) => FIELD_LABELS[field] ?? field))];
  return `Editó ${label.toLowerCase()}${name}${fields.length ? `: ${fields.join(", ")}` : ""}`;
}
