import type { VideoProvider } from "@/types/database";

export type ParsedVideo = {
  provider: VideoProvider;
  id: string;
  embedUrl: string;
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

// Acepta enlaces comunes de YouTube y Vimeo y devuelve la URL del reproductor
// incrustado. Devuelve null si el enlace no es de un proveedor admitido.
export function parseVideoUrl(raw: string): ParsedVideo | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^www\.|^m\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "youtu.be") {
    let id: string | null = null;
    if (host === "youtu.be") id = parts[0] ?? null;
    else if (parts[0] === "watch") id = url.searchParams.get("v");
    else if (["embed", "shorts", "live", "v"].includes(parts[0] ?? "")) id = parts[1] ?? null;
    if (!id || !YOUTUBE_ID.test(id)) return null;
    return {
      provider: "youtube",
      id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`,
    };
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    // vimeo.com/123456789, vimeo.com/123456789/abcdef (no listado),
    // player.vimeo.com/video/123456789?h=abcdef
    const numeric = parts.filter((part) => /^\d+$/.test(part));
    const id = numeric[0];
    if (!id) return null;
    const afterId = parts[parts.indexOf(id) + 1];
    const hash =
      url.searchParams.get("h") ?? (afterId && /^[a-f0-9]+$/i.test(afterId) ? afterId : null);
    const params = new URLSearchParams({ dnt: "1" });
    if (hash) params.set("h", hash);
    return {
      provider: "vimeo",
      id,
      embedUrl: `https://player.vimeo.com/video/${id}?${params.toString()}`,
    };
  }

  return null;
}
