import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, safeNextPath } from "@/lib/auth";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const nextPath = safeNextPath(next);

  if (await getCurrentUser()) redirect(nextPath);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
        <CardDescription>Entrá para seguir aprendiendo.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <LoginForm
          next={nextPath}
          initialError={
            error === "enlace-invalido"
              ? "El enlace no es válido o ya venció. Pedí uno nuevo."
              : undefined
          }
        />
        <p className="text-muted-foreground text-center text-sm">
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="text-primary hover:underline">
            Registrate gratis
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
