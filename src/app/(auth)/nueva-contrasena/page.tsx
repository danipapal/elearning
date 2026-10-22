import type { Metadata } from "next";
import Link from "next/link";

import { NewPasswordForm } from "@/components/auth/new-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function NewPasswordPage() {
  const user = await getCurrentUser();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Nueva contraseña</CardTitle>
        <CardDescription>
          {user ? "Elegí una contraseña nueva para tu cuenta." : "El enlace no es válido o ya venció."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {user ? (
          <NewPasswordForm />
        ) : (
          <Link href="/recuperar" className="text-primary text-sm hover:underline">
            Pedir un enlace nuevo
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
