"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Loader2 } from "lucide-react";

import { safeNextPath } from "@/lib/safe-path";
import { publicEnv } from "@/lib/env";

export function HashSession() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const search = new URLSearchParams(window.location.search);
    // Se borra el fragmento para que los tokens no queden en el historial.
    window.history.replaceState(null, "", window.location.pathname);

    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    async function signIn() {
      if (!accessToken || !refreshToken) return false;
      const supabase = createBrowserClient(
        publicEnv.NEXT_PUBLIC_SUPABASE_URL,
        publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        { isSingleton: false, auth: { detectSessionInUrl: false } },
      );
      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (error) return false;
      const next = hash.get("type") === "recovery" ? "/nueva-contrasena" : safeNextPath(search.get("next"));
      router.replace(next);
      router.refresh();
      return true;
    }

    signIn().then((ok) => {
      if (!ok) setFailed(true);
    });
  }, [router]);

  if (failed) {
    return (
      <div className="grid gap-3">
        <h1 className="text-2xl font-bold">El enlace no es válido</h1>
        <p className="text-muted-foreground">
          Puede que haya vencido o que ya se haya usado. Podés pedir uno nuevo desde{" "}
          <Link href="/recuperar" className="text-primary underline">
            Recuperar contraseña
          </Link>{" "}
          o <Link href="/login" className="text-primary underline">iniciar sesión</Link>.
        </p>
      </div>
    );
  }
  return (
    <p className="text-muted-foreground flex items-center justify-center gap-2">
      <Loader2 className="size-4 animate-spin" /> Ingresando…
    </p>
  );
}
