import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cursos" };

export default function CoursesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold">Cursos</h1>
      <p className="text-muted-foreground mt-2">
        Muy pronto vas a encontrar acá el catálogo completo.
      </p>
    </div>
  );
}
