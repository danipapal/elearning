"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { isEmptyHtml, sanitizeRichText } from "@/lib/sanitize";
import { COVERS_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, type FormState } from "@/lib/validation/form";
import { legalSchema, siteSettingsSchema } from "@/lib/validation/site";

function saveError(error: { code: string; message: string }) {
  console.error("[admin] configuración", error.code, error.message);
  return { error: "No se pudo guardar. Volvé a intentar." };
}

export async function updateSiteSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = siteSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").update(parsed.data).eq("id", true);
  if (error) return saveError(error);
  refresh();
  return { success: "Configuración guardada." };
}

// Texto legal. Vacío = vuelve al texto modelo.
export async function updateLegalText(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = legalSchema.safeParse({
    kind: formData.get("kind"),
    html: formData.get("restore") ? "" : formData.get("html"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const html = isEmptyHtml(parsed.data.html) ? null : sanitizeRichText(parsed.data.html);
  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .update(parsed.data.kind === "terms" ? { terms_html: html } : { privacy_html: html })
    .eq("id", true);
  if (error) return saveError(error);
  refresh();
  return { success: html ? "Texto guardado." : "Se restauró el texto modelo." };
}

const logoPath = z.string().regex(/^branding\/site-logo\/[0-9a-f-]{36}\.(png|jpg)$/);

// Guarda el logo del sitio ya subido y borra el anterior.
export async function setSiteLogo(path: string | null) {
  await requireAdmin();
  if (path !== null && !logoPath.safeParse(path).success) return { error: "Imagen inválida." };
  const supabase = await createClient();
  const { data: current } = await supabase.from("site_settings").select("logo_path").eq("id", true).single();
  const { error } = await supabase.from("site_settings").update({ logo_path: path }).eq("id", true);
  if (error) return { error: "No se pudo guardar la imagen." };
  if (current?.logo_path && current.logo_path !== path) {
    await supabase.storage.from(COVERS_BUCKET).remove([current.logo_path]);
  }
  refresh();
  return {};
}
