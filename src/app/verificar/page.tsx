import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeCode } from "@/lib/certificates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Verificar certificado",
  description: "Comprobá que un certificado emitido por la plataforma es auténtico.",
};

export default async function VerifyPage({ searchParams }: PageProps<"/verificar">) {
  const { codigo } = await searchParams;
  const typed = typeof codigo === "string" ? codigo.trim().slice(0, 20) : "";
  const code = normalizeCode(typed);

  const supabase = await createClient();
  const { data } = code ? await supabase.rpc("verify_certificate", { p_code: code }) : { data: null };
  const certificate = data?.[0];

  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-1 gap-6 px-4 py-12">
      <div>
        <h1 className="text-3xl font-bold">Verificar certificado</h1>
        <p className="text-muted-foreground mt-1">Ingresá el código que figura al pie del certificado.</p>
      </div>
      <form className="flex gap-2" role="search">
        <Input
          name="codigo"
          defaultValue={typed}
          placeholder="XXXX-XXXX-XXXX"
          aria-label="Código del certificado"
          className="font-mono uppercase"
          maxLength={20}
          required
        />
        <Button type="submit">Verificar</Button>
      </form>

      {typed &&
        (certificate ? (
          <div className="grid gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-6">
            <p className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
              <BadgeCheck className="size-5" /> Certificado válido
            </p>
            <p>
              <strong>{certificate.full_name}</strong> completó el curso{" "}
              {certificate.course_slug ? (
                <Link href={`/cursos/${certificate.course_slug}`} className="font-semibold underline">
                  {certificate.course_title}
                </Link>
              ) : (
                <strong>{certificate.course_title}</strong>
              )}{" "}
              el{" "}
              {new Intl.DateTimeFormat("es-AR", {
                dateStyle: "long",
                timeZone: "America/Argentina/Buenos_Aires",
              }).format(new Date(certificate.issued_at))}
              .
            </p>
            <p className="text-muted-foreground font-mono text-sm">Código {certificate.code}</p>
          </div>
        ) : (
          <div className="grid gap-2 rounded-xl border border-dashed p-6">
            <p className="flex items-center gap-2 font-semibold">
              <SearchX className="size-5" /> No encontramos ese certificado
            </p>
            <p className="text-muted-foreground text-sm">
              Revisá que el código esté bien escrito (tiene el formato XXXX-XXXX-XXXX).
            </p>
          </div>
        ))}
    </div>
  );
}
