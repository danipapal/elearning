import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { emailEnabled, fillPlaceholders, renderEmail, sendEmails } from "@/lib/email";
import { publicEnv } from "@/lib/env";
import { getSiteSettings } from "@/lib/site";
import type { Database, EmailTemplateKey } from "@/types/database";

type Client = SupabaseClient<Database>;
type Recipient = { email: string; fullName: string };

// Emails automáticos con plantilla editable. Se llaman con la sesión del propio
// alumno, dentro de after(), para no demorar la respuesta.

async function sendTemplate(
  supabase: Client,
  key: EmailTemplateKey,
  messages: { to: string; values: Record<string, string>; url: string }[],
) {
  if (!messages.length) return;
  const [{ data: template }, settings] = await Promise.all([
    supabase.from("email_templates").select("*").eq("key", key).maybeSingle(),
    getSiteSettings(),
  ]);
  if (!template?.enabled) return;
  const result = await sendEmails(
    messages.map(({ to, values, url }) => {
      const allValues = { sitio: settings.site_name, ...values };
      return {
        to,
        subject: fillPlaceholders(template.subject, allValues, false),
        html: renderEmail({
          settings,
          bodyHtml: fillPlaceholders(template.body_html, allValues),
          button: { label: template.button_label, url },
        }),
      };
    }),
    settings.site_name,
  );
  if (result.error) console.error(`[email] ${key}:`, result.error);
}

// Bienvenida: una sola vez por cuenta (la base lo garantiza).
export async function sendWelcomeEmail(supabase: Client, user: Recipient) {
  if (!emailEnabled() || !user.email) return;
  const { data: claimed, error } = await supabase.rpc("claim_welcome_email");
  if (error) return console.error("[email] bienvenida", error.code, error.message);
  if (!claimed) return;
  await sendTemplate(supabase, "welcome", [
    {
      to: user.email,
      values: { nombre: user.fullName },
      url: `${publicEnv.NEXT_PUBLIC_SITE_URL}/cursos`,
    },
  ]);
}

// Certificados recién emitidos que todavía no se avisaron.
export async function sendCertificateEmails(supabase: Client, user: Recipient) {
  if (!emailEnabled() || !user.email) return;
  const { data: certificates, error } = await supabase.rpc("claim_certificate_emails");
  if (error) return console.error("[email] certificado", error.code, error.message);
  await sendTemplate(
    supabase,
    "certificate",
    (certificates ?? []).map((certificate) => ({
      to: user.email,
      values: { nombre: certificate.full_name, curso: certificate.course_title, codigo: certificate.code },
      url: `${publicEnv.NEXT_PUBLIC_SITE_URL}/certificados/${certificate.code}`,
    })),
  );
}
