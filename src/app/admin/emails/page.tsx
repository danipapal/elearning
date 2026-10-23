import type { Metadata } from "next";
import { CheckCircle2, CircleAlert } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { emailEnabled } from "@/lib/email";
import { serverEnv } from "@/lib/server-env";
import { createClient } from "@/lib/supabase/server";
import { turnstileEnabled } from "@/lib/turnstile";
import { formatDateTime } from "@/lib/users";

import { AnnouncementForm } from "./announcement-form";
import { EmailTemplateForm } from "./template-form";

export const metadata: Metadata = { title: "Emails" };

const TEMPLATES = {
  welcome: {
    title: "Bienvenida",
    description: "Se envía cuando alguien confirma su cuenta.",
    placeholders: "{nombre} y {sitio}",
  },
  certificate: {
    title: "Certificado obtenido",
    description: "Se envía cuando un alumno completa un curso. El botón lleva al certificado.",
    placeholders: "{nombre}, {curso}, {codigo} y {sitio}",
  },
} as const;

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="Activo" />
      ) : (
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-label="Pendiente" />
      )}
      <span>{children}</span>
    </li>
  );
}

export default async function EmailsAdminPage() {
  const supabase = await createClient();
  const [{ data: templates }, { data: courses }, { data: announcements }] = await Promise.all([
    supabase.from("email_templates").select("*").order("key", { ascending: false }),
    supabase.from("courses").select("id, title").neq("status", "archived").order("title"),
    supabase
      .from("announcements")
      .select("id, subject, recipients, created_at, courses(title)")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const canSend = emailEnabled();

  return (
    <div className="grid grid-cols-1 gap-6">
      <div>
        <h1 className="text-3xl font-bold">Emails</h1>
        <p className="text-muted-foreground mt-1">Plantillas automáticas y anuncios a los alumnos.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm">
            <Status ok={canSend}>
              {canSend
                ? `Envío de emails activo (remitente: ${serverEnv.EMAIL_FROM}).`
                : "Envío de emails sin configurar: faltan RESEND_API_KEY y EMAIL_FROM en Render. Mientras tanto no salen la bienvenida, el aviso de certificado, los anuncios ni el formulario de contacto."}
            </Status>
            <Status ok={turnstileEnabled()}>
              {turnstileEnabled()
                ? "Captcha (Cloudflare Turnstile) activo en registro, recuperación de contraseña y contacto."
                : "Captcha sin configurar: faltan NEXT_PUBLIC_TURNSTILE_SITE_KEY y TURNSTILE_SECRET_KEY en Render."}
            </Status>
            <li className="text-muted-foreground">
              Los emails de confirmación de cuenta y de recuperación de contraseña los envía Supabase: se editan en
              Supabase &gt; Authentication &gt; Emails.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enviar un anuncio</CardTitle>
          <CardDescription>Novedades, cursos nuevos o avisos importantes.</CardDescription>
        </CardHeader>
        <CardContent>
          <AnnouncementForm courses={courses ?? []} canSend={canSend} />
        </CardContent>
      </Card>

      {(templates ?? []).map((template) => (
        <Card key={template.key}>
          <CardHeader>
            <CardTitle>{TEMPLATES[template.key].title}</CardTitle>
            <CardDescription>{TEMPLATES[template.key].description}</CardDescription>
          </CardHeader>
          <CardContent>
            <EmailTemplateForm template={template} placeholders={TEMPLATES[template.key].placeholders} canSend={canSend} />
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Anuncios enviados</CardTitle>
        </CardHeader>
        <CardContent>
          {!announcements?.length ? (
            <p className="text-muted-foreground text-sm">Todavía no enviaste anuncios.</p>
          ) : (
            <ul className="divide-y rounded-lg border text-sm">
              {announcements.map((announcement) => (
                <li key={announcement.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0">
                    <span className="font-medium">{announcement.subject}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {announcement.courses?.title ? `Inscritos en ${announcement.courses.title}` : "Todos"}
                    </span>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {announcement.recipients} destinatarios · {formatDateTime(announcement.created_at)}
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
