import "server-only";

import { z } from "zod";

// Variables secretas u opcionales del servidor. Nunca se importan desde
// componentes de cliente ("server-only" lo impide). Si faltan, la función
// correspondiente queda desactivada en lugar de romper la aplicación.
const schema = z.object({
  RESEND_API_KEY: z.string().min(10).optional(),
  // Dirección remitente en un dominio verificado en Resend, ej: hola@midominio.com
  EMAIL_FROM: z.email().optional(),
  TURNSTILE_SECRET_KEY: z.string().min(10).optional(),
  // Solo para pruebas locales: permite apuntar a un servidor simulado.
  RESEND_API_URL: z.url().optional(),
});

const empty = (value: string | undefined) => (value?.trim() ? value.trim() : undefined);

const parsed = schema.safeParse({
  RESEND_API_KEY: empty(process.env.RESEND_API_KEY),
  EMAIL_FROM: empty(process.env.EMAIL_FROM),
  TURNSTILE_SECRET_KEY: empty(process.env.TURNSTILE_SECRET_KEY),
  RESEND_API_URL: empty(process.env.RESEND_API_URL),
});

if (!parsed.success) {
  console.error("[env] variables inválidas:", Object.keys(z.flattenError(parsed.error).fieldErrors).join(", "));
}

export const serverEnv = parsed.success ? parsed.data : {};
