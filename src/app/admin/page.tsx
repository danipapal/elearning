import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Administración", robots: { index: false } };

const roleLabels = {
  superadmin: "Superadministrador",
  admin: "Administrador",
  instructor: "Instructor",
  student: "Alumno",
} as const;

const sections = [
  { title: "Cursos", text: "Crear y editar cursos, módulos y lecciones.", phase: "Fase 2" },
  { title: "Usuarios", text: "Alumnos, inscripciones y roles.", phase: "Fase 4" },
  { title: "Estadísticas", text: "Registros, progreso y actividad.", phase: "Fase 4" },
];

export default async function AdminPage() {
  const user = await requireAdmin();

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">Administración</h1>
        <Badge variant="secondary">{roleLabels[user.role]}</Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {section.title}
                <Badge variant="outline">{section.phase}</Badge>
              </CardTitle>
              <CardDescription>{section.text}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
