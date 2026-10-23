import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";

// Cliente sin sesión ni cookies, para pedirle a Supabase que mande emails a
// otro usuario (verificación, restablecer contraseña) sin tocar la sesión del
// admin. Flujo "implicit": el enlace funciona en cualquier navegador porque no
// depende de un código guardado en el navegador de quien lo pidió.
export function createStatelessClient() {
  return createSupabaseClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
