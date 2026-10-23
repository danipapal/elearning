"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { COVERS_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, type FormState } from "@/lib/validation/form";

const settingsSchema = z.object({
  title: z.string().trim().min(1, { error: "Ingresá un título." }).max(80),
  recipientLabel: z.string().trim().max(80),
  body: z.string().trim().min(1, { error: "Ingresá el texto." }).max(400),
  signerName: z.string().trim().max(80),
  signerTitle: z.string().trim().max(80),
});

export async function updateCertificateSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase
    .from("certificate_settings")
    .update({
      title: parsed.data.title,
      recipient_label: parsed.data.recipientLabel,
      body: parsed.data.body,
      signer_name: parsed.data.signerName,
      signer_title: parsed.data.signerTitle,
    })
    .eq("id", true);
  if (error) {
    console.error("[admin] plantilla certificado", error.code, error.message);
    return { error: "No se pudo guardar. Volvé a intentar." };
  }
  refresh();
  return { success: "Plantilla guardada." };
}

const kindSchema = z.enum(["logo", "signature"]);
const pathSchema = z.string().regex(/^branding\/(logo|signature)\/[0-9a-f-]{36}\.(png|jpg)$/);

// Guarda la ruta de una imagen ya subida (logo o firma) y borra la anterior.
export async function setCertificateImage(kind: "logo" | "signature", path: string | null) {
  await requireAdmin();
  if (!kindSchema.safeParse(kind).success || (path !== null && !pathSchema.safeParse(path).success)) {
    return { error: "Imagen inválida." };
  }
  if (path && !path.startsWith(`branding/${kind}/`)) return { error: "Imagen inválida." };
  const supabase = await createClient();
  const column = kind === "logo" ? "logo_path" : "signature_path";
  const { data: current } = await supabase.from("certificate_settings").select(column).eq("id", true).single();
  const { error } = await supabase
    .from("certificate_settings")
    .update(kind === "logo" ? { logo_path: path } : { signature_path: path })
    .eq("id", true);
  if (error) return { error: "No se pudo guardar la imagen." };
  const previous = current ? (current as Record<string, string | null>)[column] : null;
  if (previous && previous !== path) await supabase.storage.from(COVERS_BUCKET).remove([previous]);
  refresh();
  return {};
}
