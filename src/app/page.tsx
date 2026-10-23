import Link from "next/link";
import { BookOpen, PlayCircle, Award } from "lucide-react";

import { CourseCard } from "@/components/course-card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

const features = [
  {
    icon: PlayCircle,
    title: "Clases en video",
    text: "Lecciones cortas y claras que podés ver desde el celular o la computadora.",
  },
  {
    icon: BookOpen,
    title: "Material descargable",
    text: "Guías en PDF y resúmenes para repasar cuando quieras.",
  },
  {
    icon: Award,
    title: "Certificados",
    text: "Al completar un curso obtenés tu certificado con código de verificación.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: featured } = await supabase
    .from("courses")
    .select("slug, title, short_description, cover_path, level, categories(name)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(3);

  return (
    <>
      <section className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center sm:py-28">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Aprendé a tu ritmo, desde cualquier lugar
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Cursos online con videos, material descargable y seguimiento de tu progreso.
          Registrate gratis y empezá hoy.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/registro">Crear cuenta gratis</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/cursos">Ver cursos</Link>
          </Button>
        </div>
      </section>
      {featured && featured.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 pb-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold">Cursos destacados</h2>
            <Link href="/cursos" className="text-primary text-sm font-medium hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((course) => (
              <CourseCard key={course.slug} course={course} />
            ))}
          </div>
        </section>
      )}
      <section className="bg-muted/40 border-t">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="grid gap-2">
              <Icon className="text-primary size-8" />
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
