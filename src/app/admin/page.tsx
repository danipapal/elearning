import type { Metadata } from "next";
import Link from "next/link";

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
  { title: "Cursos", text: "Crear y editar cursos, módulos y lecciones.", href: "/admin/cursos" },
  { title: "Categorías", text: "Organizar el catálogo por temas.", href: "/admin/categorias" },
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
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => {
          const card = (
            <Card className={section.href ? "hover:border-primary h-full transition-colors" : "h-full opacity-70"}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {section.title}
                  {section.phase && <Badge variant="outline">{section.phase}</Badge>}
                </CardTitle>
                <CardDescription>{section.text}</CardDescription>
              </CardHeader>
            </Card>
          );
          return section.href ? (
            <Link key={section.title} href={section.href}>
              {card}
            </Link>
          ) : (
            <div key={section.title}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
