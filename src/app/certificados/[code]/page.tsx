import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, Download, ShieldCheck } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { normalizeCode, verifyUrl } from "@/lib/certificates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Certificado", robots: { index: false } };

export default async function CertificatePage({ params }: PageProps<"/certificados/[code]">) {
  const raw = (await params).code;
  await requireUser(`/certificados/${raw}`);
  const code = normalizeCode(raw);
  if (!code) notFound();

  const supabase = await createClient();
  const { data: certificate } = await supabase
    .from("certificates")
    .select("code, full_name, course_title, issued_at")
    .eq("code", code)
    .maybeSingle();
  if (!certificate) notFound();

  const date = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(certificate.issued_at));
  const link = verifyUrl(certificate.code);

  return (
    <div className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-6 px-4 py-12">
      <Link href="/mi-aprendizaje" className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm">
        <ArrowLeft className="size-4" /> Mi aprendizaje
      </Link>
      <div className="bg-card grid justify-items-center gap-3 rounded-xl border p-8 text-center">
        <Award className="text-primary size-12" />
        <p className="text-muted-foreground text-sm">Certificado de finalización</p>
        <h1 className="text-2xl font-bold">{certificate.course_title}</h1>
        <p>
          Otorgado a <strong>{certificate.full_name}</strong> el {date}
        </p>
        <p className="text-muted-foreground font-mono text-sm">Código {certificate.code}</p>
        <Button asChild size="lg" className="mt-2">
          <a href={`/certificados/${certificate.code}/pdf`} target="_blank" rel="noopener">
            <Download /> Descargar PDF
          </a>
        </Button>
      </div>
      <div className="grid gap-2 rounded-lg border p-4">
        <p className="flex items-center gap-2 font-medium">
          <ShieldCheck className="size-4 text-emerald-600" /> Enlace de verificación
        </p>
        <p className="text-muted-foreground text-sm">
          Compartilo (por ejemplo en LinkedIn o con un empleador) para que cualquiera compruebe que el certificado es auténtico.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="bg-muted min-w-0 flex-1 truncate rounded px-2 py-1.5 text-xs">{link}</code>
          <CopyButton value={link} />
        </div>
      </div>
    </div>
  );
}
