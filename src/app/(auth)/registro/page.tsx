import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/auth/register-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/mi-aprendizaje");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Crear cuenta</CardTitle>
        <CardDescription>Registrate gratis y empezá a estudiar.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <RegisterForm />
        <p className="text-muted-foreground text-center text-sm">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
