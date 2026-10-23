import type { Metadata } from "next";

import { HashSession } from "./hash-session";

export const metadata: Metadata = { title: "Ingresando…", robots: { index: false } };

// Destino de los enlaces que pide un admin (reenviar verificación, restablecer
// contraseña). La sesión viene en el fragmento (#) de la URL, que solo el
// navegador puede leer.
export default function AuthCallbackPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
      <HashSession />
    </div>
  );
}
