import "server-only";

import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { CertificateSettings } from "@/types/database";

export const CERTIFICATE_CODE = /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/;

export function normalizeCode(value: unknown) {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  return CERTIFICATE_CODE.test(code) ? code : null;
}

export function verifyUrl(code: string) {
  return `${publicEnv.NEXT_PUBLIC_SITE_URL}/verificar?codigo=${code}`;
}

export const DEFAULT_CERTIFICATE_SETTINGS: CertificateSettings = {
  id: true,
  title: "Certificado de finalización",
  recipient_label: "Se otorga a",
  body: "por haber completado satisfactoriamente el curso {curso}.",
  signer_name: "",
  signer_title: "",
  logo_path: null,
  signature_path: null,
  updated_at: new Date(0).toISOString(),
};

export async function getCertificateSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("certificate_settings").select("*").maybeSingle();
  return data ?? DEFAULT_CERTIFICATE_SETTINGS;
}

export function pdfResponse(bytes: Uint8Array, filename: string) {
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}
