import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

// Destino de los enlaces de los emails de Supabase (confirmación de cuenta
// y recuperación de contraseña). Verifica el token e inicia la sesión.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  // Se usa la URL pública del sitio: detrás del proxy de Render el host interno no sirve.
  const destination = ok
    ? type === "recovery"
      ? "/nueva-contrasena"
      : next
    : "/login?error=enlace-invalido";
  return NextResponse.redirect(new URL(destination, publicEnv.NEXT_PUBLIC_SITE_URL));
}
