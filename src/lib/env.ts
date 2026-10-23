import { z } from "zod";

// Solo variables públicas (NEXT_PUBLIC_*): son las únicas que pueden llegar
// al navegador. Las claves secretas nunca se leen desde este archivo.
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.url(),
  // Cloudflare Turnstile (captcha). Opcional: sin clave no se muestra.
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(10).optional(),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || undefined,
});

// Nombre por defecto; el real se edita en Administración > Configuración.
export const SITE_NAME = "Plataforma de Cursos";
