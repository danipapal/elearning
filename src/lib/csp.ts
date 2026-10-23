// Content Security Policy: solo se ejecutan los scripts de la propia
// aplicación (con un nonce distinto en cada request) y se limitan los
// orígenes de imágenes, iframes (videos, captcha) y conexiones.
export function buildCsp(nonce: string) {
  const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co");
  const supabaseWs = `${supabase.protocol === "https:" ? "wss:" : "ws:"}//${supabase.host}`;
  const isDev = process.env.NODE_ENV === "development";
  const isHttps = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Estilos en línea: los usan algunos componentes (anchos de barras, color de marca).
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabase.origin}`,
    "font-src 'self'",
    `connect-src 'self' ${supabase.origin} ${supabaseWs} https://challenges.cloudflare.com`,
    "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com https://challenges.cloudflare.com",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isHttps ? ["upgrade-insecure-requests"] : []),
  ];
  return directives.join("; ");
}
