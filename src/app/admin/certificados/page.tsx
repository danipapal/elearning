import type { Metadata } from "next";
import Link from "next/link";
import { Eye } from "lucide-react";

import { BrandingUpload } from "@/components/admin/branding-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCertificateSettings } from "@/lib/certificates";
import { coverUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/users";

import { setCertificateImage } from "./actions";
import { CertificateSettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Certificados" };

export default async function CertificatesAdminPage() {
  const supabase = await createClient();
  const [settings, { data: certificates, count }] = await Promise.all([
    getCertificateSettings(),
    supabase
      .from("certificates")
      .select("code, user_id, full_name, course_title, issued_at", { count: "exact" })
      .order("issued_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Certificados</h1>
          <p className="text-muted-foreground mt-1">
            Se emiten solos cuando un alumno completa el 100% de un curso.
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href="/admin/certificados/vista-previa" target="_blank" rel="noopener">
            <Eye /> Vista previa
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plantilla</CardTitle>
          <CardDescription>Los cambios se aplican también a los certificados ya emitidos al descargarlos.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <BrandingUpload
              kind="logo"
              label="Logo"
              hint="PNG con fondo transparente, idealmente horizontal."
              imageUrl={coverUrl(settings.logo_path)}
              save={setCertificateImage.bind(null, "logo")}
            />
            <BrandingUpload
              kind="signature"
              label="Firma"
              hint="PNG con fondo transparente. Es pública: cualquiera que vea un certificado la ve."
              imageUrl={coverUrl(settings.signature_path)}
              save={setCertificateImage.bind(null, "signature")}
            />
          </div>
          <CertificateSettingsForm settings={settings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimos emitidos</CardTitle>
          <CardDescription>{count === 1 ? "1 certificado en total" : `${count ?? 0} certificados en total`}</CardDescription>
        </CardHeader>
        <CardContent>
          {!certificates?.length ? (
            <p className="text-muted-foreground text-sm">Todavía no se emitió ningún certificado.</p>
          ) : (
            <ul className="divide-y rounded-lg border text-sm">
              {certificates.map((certificate) => (
                <li key={certificate.code} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0">
                    <Link href={`/admin/usuarios/${certificate.user_id}`} className="font-medium hover:underline">
                      {certificate.full_name}
                    </Link>
                    <span className="text-muted-foreground"> · {certificate.course_title}</span>
                  </span>
                  <span className="text-muted-foreground flex items-center gap-3 text-xs">
                    {formatDateTime(certificate.issued_at)}
                    <a href={`/certificados/${certificate.code}/pdf`} target="_blank" rel="noopener" className="font-mono hover:underline">
                      {certificate.code}
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
