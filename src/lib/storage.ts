import { publicEnv } from "@/lib/env";

export const COVERS_BUCKET = "course-covers";
export const FILES_BUCKET = "course-files";
export const MAX_COVER_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_BYTES = 50 * 1024 * 1024;
export const COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function coverUrl(path: string | null) {
  if (!path) return null;
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${COVERS_BUCKET}/${path}`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
