import type { Metadata } from "next";
import Link from "next/link";

import { ForgotForm } from "@/components/auth/forgot-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Recuperar contraseña</CardTitle>
        <CardDescription>
          Escribí tu email y te mandamos un enlace para crear una contraseña nueva.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <ForgotForm />
        <p className="text-muted-foreground text-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
