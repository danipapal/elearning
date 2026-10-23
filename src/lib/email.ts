import "server-only";

import { publicEnv } from "@/lib/env";
import { escapeHtml } from "@/lib/html";
import { serverEnv } from "@/lib/server-env";
import { coverUrl } from "@/lib/storage";
import type { SiteSettings } from "@/types/database";

// Envío de emails con Resend (https://resend.com). Requiere RESEND_API_KEY y
// EMAIL_FROM (en un dominio verificado). Sin eso, los envíos se omiten.

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  headers?: Record<string, string>;
};

const BATCH_SIZE = 100;

export function emailEnabled() {
  return Boolean(serverEnv.RESEND_API_KEY && serverEnv.EMAIL_FROM);
}

function fromHeader(siteName: string) {
  // Sin comillas ni saltos de línea: el nombre va dentro de un header.
  const name = siteName.replace(/["\r\n<>]/g, "").trim() || "Cursos";
  return `"${name}" <${serverEnv.EMAIL_FROM}>`;
}

// Envía uno o varios emails (de a 100 por pedido). Cada destinatario recibe
// su propio email: nadie ve las direcciones de los demás.
export async function sendEmails(messages: EmailMessage[], siteName: string) {
  if (!emailEnabled()) {
    console.warn("[email] sin configurar (RESEND_API_KEY / EMAIL_FROM): se omiten", messages.length, "emails");
    return { sent: 0, error: "El envío de emails no está configurado." };
  }
  const baseUrl = serverEnv.RESEND_API_URL ?? "https://api.resend.com";
  let sent = 0;
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE).map((message) => ({
      from: fromHeader(siteName),
      to: [message.to],
      subject: message.subject.replace(/[\r\n]+/g, " "),
      html: message.html,
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      ...(message.headers ? { headers: message.headers } : {}),
    }));
    try {
      const response = await fetch(`${baseUrl}/emails/batch`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${serverEnv.RESEND_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(batch),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        console.error("[email] Resend respondió", response.status, (await response.text()).slice(0, 500));
        return { sent, error: "El servicio de email rechazó el envío. Revisá la configuración de Resend." };
      }
      sent += batch.length;
    } catch (error) {
      console.error("[email] no se pudo enviar", error);
      return { sent, error: "No se pudo conectar con el servicio de email." };
    }
    // Resend permite pocos pedidos por segundo.
    if (i + BATCH_SIZE < messages.length) await new Promise((resolve) => setTimeout(resolve, 600));
  }
  return { sent };
}

// Reemplaza {nombre}, {curso}, etc. Los valores se escapan para HTML.
export function fillPlaceholders(text: string, values: Record<string, string>, html = true) {
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? (html ? escapeHtml(values[key]) : values[key]) : match,
  );
}

const SAFE_COLOR = /^#[0-9a-f]{6}$/;

// Arma el HTML completo del email con la marca del sitio. bodyHtml ya tiene
// que venir saneado (sale del editor o de una plantilla del sistema).
export function renderEmail({
  settings,
  bodyHtml,
  button,
  footerHtml,
}: {
  settings: SiteSettings;
  bodyHtml: string;
  button?: { label: string; url: string };
  footerHtml?: string;
}) {
  const color = SAFE_COLOR.test(settings.primary_color) ? settings.primary_color : "#1d4ed8";
  const siteName = escapeHtml(settings.site_name);
  const siteUrl = publicEnv.NEXT_PUBLIC_SITE_URL;
  const logo = coverUrl(settings.logo_path);
  const header = logo
    ? `<img src="${escapeHtml(logo)}" alt="${siteName}" style="max-height:48px;max-width:200px">`
    : `<span style="font-size:20px;font-weight:700;color:${color}">${siteName}</span>`;
  const buttonHtml = button?.label
    ? `<p style="margin:28px 0"><a href="${escapeHtml(button.url)}" style="background:${color};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">${escapeHtml(button.label)}</a></p>`
    : "";
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e4e4e7">
<tr><td style="padding:24px 28px;border-bottom:1px solid #e4e4e7"><a href="${escapeHtml(siteUrl)}" style="text-decoration:none">${header}</a></td></tr>
<tr><td style="padding:28px;font-size:16px;line-height:1.6">${bodyHtml}${buttonHtml}</td></tr>
</table>
<p style="max-width:560px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#71717a">
${footerHtml ?? ""}${footerHtml ? "<br>" : ""}© ${new Date().getFullYear()} ${siteName} · <a href="${escapeHtml(siteUrl)}" style="color:#71717a">${escapeHtml(siteUrl.replace(/^https?:\/\//, ""))}</a>
</p>
</td></tr>
</table>
</body>
</html>`;
}
