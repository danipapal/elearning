import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const RECOVERY_PATH = "/nueva-contrasena";

// Destino de los enlaces de los emails de Supabase (confirmación de cuenta
// y recuperación de contraseña). Acepta los dos formatos:
// - token_hash + type: plantillas de email personalizadas.
// - code: plantillas por defecto de Supabase (flujo PKCE).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const isRecovery = type === "recovery" || next === RECOVERY_PATH;

  const supabase = await createClient();
  let destination = "/login?error=enlace-invalido";

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) destination = isRecovery ? RECOVERY_PATH : next;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      destination = isRecovery ? RECOVERY_PATH : next;
    } else if (!isRecovery) {
      // Supabase ya confirmó el email antes de redirigir con el code. Si no se
      // pudo iniciar sesión (por ejemplo, el enlace se abrió en otro navegador
      // o en el celular), la cuenta igual quedó confirmada: solo falta entrar.
      destination = "/login?mensaje=email-confirmado";
    }
  }

  // Se usa la URL pública del sitio: detrás del proxy de Render el host interno no sirve.
  return NextResponse.redirect(new URL(destination, publicEnv.NEXT_PUBLIC_SITE_URL));
}
