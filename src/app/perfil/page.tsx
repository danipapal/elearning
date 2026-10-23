import type { Metadata } from "next";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { AnnouncementsToggle, DeleteAccountForm, PasswordForm, ProfileForm } from "./profile-forms";

export const metadata: Metadata = { title: "Mi perfil", robots: { index: false } };

export default async function ProfilePage() {
  const user = await requireUser("/perfil");
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email_announcements")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-6 px-4 py-10">
      <h1 className="text-3xl font-bold">Mi perfil</h1>

      <Card>
        <CardHeader>
          <CardTitle>Tus datos</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm fullName={user.fullName} email={user.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>

      <Card id="emails">
        <CardHeader>
          <CardTitle>Emails</CardTitle>
        </CardHeader>
        <CardContent>
          <AnnouncementsToggle enabled={profile?.email_announcements ?? true} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tus datos personales</CardTitle>
          <CardDescription>Descargá una copia de toda la información que guardamos sobre vos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <a href="/perfil/mis-datos" download>
              <Download /> Descargar mis datos
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Eliminar cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteAccountForm />
        </CardContent>
      </Card>
    </div>
  );
}
