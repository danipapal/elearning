"use server";

import { emailEnabled, renderEmail, sendEmails } from "@/lib/email";
import { escapeHtml } from "@/lib/html";
import { HOUR, TOO_MANY_ATTEMPTS, clientIp, rateLimitAll } from "@/lib/rate-limit";
import { getSiteSettings } from "@/lib/site";
import { CAPTCHA_ERROR, TURNSTILE_FIELD, verifyTurnstile } from "@/lib/turnstile";
import { fieldErrors, type FormState } from "@/lib/validation/form";
import { contactSchema } from "@/lib/validation/site";

// Formulario de contacto: llega por email a la dirección de contacto del
// sitio, con "responder a" del visitante.
export async function sendContactMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    message: String(formData.get("message") ?? ""),
  };
  // Campo trampa: invisible para personas, los bots suelen completarlo.
  if (formData.get("website")) return { success: "¡Gracias! Recibimos tu mensaje." };

  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const settings = await getSiteSettings();
  if (!emailEnabled() || !settings.contact_email) {
    return { error: "El formulario no está disponible. Escribinos por email.", values };
  }

  const ip = await clientIp();
  if (!rateLimitAll([[`contact:ip:${ip}`, 3, HOUR], [`contact:email:${parsed.data.email}`, 3, HOUR]])) {
    return { error: TOO_MANY_ATTEMPTS, values };
  }
  if (!(await verifyTurnstile(formData.get(TURNSTILE_FIELD), ip))) {
    return { error: CAPTCHA_ERROR, values };
  }

  const { name, email, message } = parsed.data;
  const result = await sendEmails(
    [
      {
        to: settings.contact_email,
        replyTo: email,
        subject: `Consulta de ${name} desde la web`,
        html: renderEmail({
          settings,
          bodyHtml: `<p><strong>Nombre:</strong> ${escapeHtml(name)}<br><strong>Email:</strong> ${escapeHtml(email)}</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p><p style="color:#71717a;font-size:13px">Respondé este email para contestarle.</p>`,
        }),
      },
    ],
    settings.site_name,
  );
  if (result.error) {
    return { error: "No pudimos enviar tu mensaje. Volvé a intentar en unos minutos.", values };
  }
  return { success: "¡Gracias! Recibimos tu mensaje y te vamos a responder por email." };
}
