// Evita redirecciones abiertas: solo rutas internas.
export function safeNextPath(value: unknown, fallback = "/mi-aprendizaje") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
