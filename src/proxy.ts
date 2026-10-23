import type { NextRequest } from "next/server";

import { buildCsp } from "@/lib/csp";
import { updateSession } from "@/lib/supabase/proxy";

// Respuestas que no son páginas HTML (PDF): el visor de PDF del navegador no
// necesita CSP y algunas directivas pueden bloquearlo.
const NO_CSP = /(?:\/pdf|\/vista-previa)$/;

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);
  const withCsp = !NO_CSP.test(request.nextUrl.pathname);

  // Next.js lee el nonce del header CSP del request y lo aplica a sus scripts.
  const requestHeaders = new Headers(request.headers);
  if (withCsp) {
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("content-security-policy", csp);
  }

  const response = await updateSession(request, requestHeaders);
  if (withCsp) response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Todo excepto archivos estáticos e imágenes.
      source:
        "/((?!_next/static|_next/image|favicon.ico|api/health|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
