import "server-only";

import { cache } from "react";

import { SITE_NAME } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { SiteSettings } from "@/types/database";

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  id: true,
  site_name: SITE_NAME,
  description: "Cursos online para aprender a tu ritmo.",
  logo_path: null,
  primary_color: "#1d4ed8",
  contact_email: "",
  instagram_url: "",
  facebook_url: "",
  youtube_url: "",
  tiktok_url: "",
  x_url: "",
  linkedin_url: "",
  whatsapp: "",
  terms_html: null,
  privacy_html: null,
  updated_at: new Date(0).toISOString(),
};

// Una sola lectura por request (layout, header, footer y página la comparten).
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("site_settings").select("*").maybeSingle();
  if (error) console.error("[site] configuración", error.code, error.message);
  return data ?? DEFAULT_SITE_SETTINGS;
});

export const SOCIAL_NETWORKS = [
  { key: "instagram_url", label: "Instagram" },
  { key: "facebook_url", label: "Facebook" },
  { key: "youtube_url", label: "YouTube" },
  { key: "tiktok_url", label: "TikTok" },
  { key: "x_url", label: "X (Twitter)" },
  { key: "linkedin_url", label: "LinkedIn" },
] as const;

export function socialLinks(settings: SiteSettings) {
  const links: { label: string; href: string }[] = SOCIAL_NETWORKS.filter(({ key }) => settings[key]).map(
    ({ key, label }) => ({ label, href: settings[key] }),
  );
  if (settings.whatsapp) links.push({ label: "WhatsApp", href: `https://wa.me/${settings.whatsapp}` });
  return links;
}

const HEX = /^#[0-9a-f]{6}$/;

// Texto blanco o casi negro según qué contraste mejor con el color de marca.
export function foregroundFor(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "#111111" : "#ffffff";
}

// CSS que reemplaza el color de marca. Solo acepta #rrggbb, así no se puede
// inyectar otra cosa en la hoja de estilos.
export function brandCss(color: string) {
  const hex = color.toLowerCase();
  if (!HEX.test(hex)) return "";
  return `:root{--primary:${hex};--primary-foreground:${foregroundFor(hex)};--ring:${hex}80}`;
}
