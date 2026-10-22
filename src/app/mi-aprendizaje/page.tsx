import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Mi aprendizaje" };

export default async function MyLearningPage({ searchParams }: PageProps<"/mi-aprendizaje">) {
  const user = await requireUser("/mi-aprendizaje");
  const { password } = await searchParams;
  const firstName = user.fullName.split(" ")[0];

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-12">
      {password === "actualizada" && (
        <p role="status" className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          Tu contraseña se actualizó correctamente.
        </p>
      )}
      <div>
        <h1 className="text-3xl font-bold">Hola{firstName ? `, ${firstName}` : ""} 👋</h1>
        <p className="text-muted-foreground mt-1">Este es tu panel de aprendizaje.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Todavía no estás inscrito en ningún curso</CardTitle>
          <CardDescription>
            Cuando te inscribas vas a ver acá tus cursos con su progreso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/cursos">Explorar cursos</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
