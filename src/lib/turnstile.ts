import "server-only";

import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";

export const TURNSTILE_FIELD = "cf-turnstile-response";

export function turnstileEnabled() {
  return Boolean(publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY && serverEnv.TURNSTILE_SECRET_KEY);
}

// Verifica el captcha con Cloudflare. Sin claves configuradas, no se exige.
export async function verifyTurnstile(token: FormDataEntryValue | null, ip: string) {
  if (!turnstileEnabled()) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: serverEnv.TURNSTILE_SECRET_KEY!, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(8000),
    });
    const result = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!result.success) console.warn("[turnstile] rechazado", result["error-codes"]);
    return result.success === true;
  } catch (error) {
    console.error("[turnstile] no se pudo verificar", error);
    return false;
  }
}

export const CAPTCHA_ERROR = "No pudimos comprobar que no sos un robot. Volvé a intentar.";
