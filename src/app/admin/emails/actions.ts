"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { emailEnabled, fillPlaceholders, renderEmail, sendEmails } from "@/lib/email";
import { publicEnv } from "@/lib/env";
import { escapeHtml } from "@/lib/html";
import { HOUR, rateLimit } from "@/lib/rate-limit";
import { isEmptyHtml, sanitizeRichText } from "@/lib/sanitize";
import { getSiteSettings } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, type FormState } from "@/lib/validation/form";
import { announcementSchema, emailTemplateSchema } from "@/lib/validation/site";
import type { EmailTemplateKey } from "@/types/database";

const NOT_CONFIGURED = "El envío de emails todavía no está configurado (falta Resend).";

export async function updateEmailTemplate(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = emailTemplateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (isEmptyHtml(parsed.data.body_html)) return { fieldErrors: { body_html: ["Escribí el texto del email."] } };
  const supabase = await createClient();
  const { error } = await supabase
    .from("email_templates")
    .update({
      subject: parsed.data.subject,
      body_html: sanitizeRichText(parsed.data.body_html),
      button_label: parsed.data.button_label,
      enabled: parsed.data.enabled === "on",
    })
    .eq("key", parsed.data.key);
  if (error) {
    console.error("[admin] plantilla email", error.code, error.message);
    return { error: "No se pudo guardar. Volvé a intentar." };
  }
  refresh();
  return { success: "Plantilla guardada." };
}

const SAMPLE: Record<EmailTemplateKey, { values: Record<string, string>; path: string }> = {
  welcome: { values: {}, path: "/cursos" },
  certificate: { values: { curso: "Curso de ejemplo", codigo: "ABCD-1234-EF56" }, path: "/mi-aprendizaje" },
};

// Prueba de una plantilla guardada: llega al email del admin.
export async function sendTemplateTest(key: EmailTemplateKey) {
  const admin = await requireAdmin();
  if (!z.enum(["welcome", "certificate"]).safeParse(key).success) return { error: "Plantilla inválida." };
  if (!emailEnabled()) return { error: NOT_CONFIGURED };
  if (!rateLimit(`email-test:${admin.id}`, 10, HOUR)) return { error: "Hiciste muchas pruebas. Esperá un rato." };
  const supabase = await createClient();
  const [{ data: template }, settings] = await Promise.all([
    supabase.from("email_templates").select("*").eq("key", key).single(),
    getSiteSettings(),
  ]);
  if (!template) return { error: "No se encontró la plantilla." };
  const values = { sitio: settings.site_name, nombre: admin.fullName, ...SAMPLE[key].values };
  const result = await sendEmails(
    [
      {
        to: admin.email,
        subject: `[Prueba] ${fillPlaceholders(template.subject, values, false)}`,
        html: renderEmail({
          settings,
          bodyHtml: fillPlaceholders(template.body_html, values),
          button: { label: template.button_label, url: `${publicEnv.NEXT_PUBLIC_SITE_URL}${SAMPLE[key].path}` },
        }),
      },
    ],
    settings.site_name,
  );
  if (result.error) return { error: result.error };
  return { success: `Te enviamos una prueba a ${admin.email}.` };
}

async function recipients(courseId: string | null) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_announcement_recipients", { p_course_id: courseId });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function countAnnouncementRecipients(courseId: string) {
  await requireAdmin();
  if (courseId !== "" && !z.guid().safeParse(courseId).success) return { error: "Curso inválido." };
  try {
    return { count: (await recipients(courseId || null)).length };
  } catch {
    return { error: "No se pudo calcular los destinatarios." };
  }
}

export type AnnouncementResult = FormState & { sent?: number };

// Envía un anuncio (o una prueba al propio admin si test = true).
export async function sendAnnouncement(
  input: { subject: string; body_html: string; course_id: string },
  test: boolean,
): Promise<AnnouncementResult> {
  const admin = await requireAdmin();
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (isEmptyHtml(parsed.data.body_html)) return { fieldErrors: { body_html: ["Escribí el texto del anuncio."] } };
  if (!emailEnabled()) return { error: NOT_CONFIGURED };
  if (!rateLimit(`announcement:${admin.id}:${test ? "test" : "send"}`, test ? 10 : 5, HOUR)) {
    return { error: "Llegaste al límite de envíos por hora. Probá más tarde." };
  }

  const courseId = parsed.data.course_id || null;
  const list = test ? [{ email: admin.email, full_name: admin.fullName }] : await recipients(courseId).catch(() => null);
  if (!list) return { error: "No se pudo obtener la lista de destinatarios." };
  if (!list.length) return { error: "No hay destinatarios para este anuncio." };

  const settings = await getSiteSettings();
  const body = sanitizeRichText(parsed.data.body_html);
  const footer = `Recibís este email porque tenés una cuenta en ${escapeHtml(settings.site_name)}. Si no querés recibir más anuncios, desactivalos en <a href="${escapeHtml(publicEnv.NEXT_PUBLIC_SITE_URL)}/perfil" style="color:#71717a">tu perfil</a>.`;
  const result = await sendEmails(
    list.map((recipient) => {
      const values = { sitio: settings.site_name, nombre: recipient.full_name };
      return {
        to: recipient.email,
        subject: `${test ? "[Prueba] " : ""}${fillPlaceholders(parsed.data.subject, values, false)}`,
        html: renderEmail({ settings, bodyHtml: fillPlaceholders(body, values), footerHtml: footer }),
      };
    }),
    settings.site_name,
  );

  if (!test && result.sent > 0) {
    const supabase = await createClient();
    const { error } = await supabase.from("announcements").insert({
      subject: parsed.data.subject,
      body_html: body,
      course_id: courseId,
      recipients: result.sent,
      sent_by: admin.id,
    });
    if (error) console.error("[admin] registrar anuncio", error.code, error.message);
    refresh();
  }

  if (result.error) {
    return {
      error: result.sent ? `Se enviaron ${result.sent} de ${list.length} emails. ${result.error}` : result.error,
      sent: result.sent,
    };
  }
  return {
    success: test
      ? `Te enviamos una prueba a ${admin.email}.`
      : `¡Listo! Se envió el anuncio a ${result.sent} ${result.sent === 1 ? "persona" : "personas"}.`,
    sent: result.sent,
  };
}
