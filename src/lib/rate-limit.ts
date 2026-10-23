import "server-only";

import { headers } from "next/headers";

// Límite de intentos en memoria (ventana fija). Alcanza para un solo servidor
// como el de Render; se reinicia si el servidor se reinicia.
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 20_000;

export const TOO_MANY_ATTEMPTS = "Demasiados intentos. Esperá unos minutos y volvé a probar.";

function prune(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Si sigue lleno, se descartan los más viejos (el Map mantiene el orden de alta).
  for (const key of buckets.keys()) {
    if (buckets.size <= MAX_KEYS * 0.9) break;
    buckets.delete(key);
  }
}

// Devuelve true si el intento está permitido y lo cuenta.
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size >= MAX_KEYS) prune(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

// Permite el intento solo si todas las reglas lo permiten.
export function rateLimitAll(rules: [key: string, limit: number, windowMs: number][]) {
  return rules.map((rule) => rateLimit(...rule)).every(Boolean);
}

// IP del visitante. Render está detrás de Cloudflare, que fija estos headers
// (el visitante no puede falsificarlos).
export async function clientIp() {
  const list = await headers();
  return (
    list.get("true-client-ip") ??
    list.get("cf-connecting-ip") ??
    list.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "desconocida"
  );
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
