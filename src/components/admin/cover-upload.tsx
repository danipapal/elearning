"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { removeCourseCover, setCourseCover } from "@/app/admin/cursos/actions";
import { Button } from "@/components/ui/button";
import { COVERS_BUCKET, COVER_TYPES, MAX_COVER_BYTES } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function CoverUpload({ courseId, coverUrl }: { courseId: string; coverUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function upload(file: File) {
    setError(null);
    if (!COVER_TYPES.includes(file.type)) {
      setError("La portada tiene que ser JPG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      setError("La imagen supera los 5 MB.");
      return;
    }
    startTransition(async () => {
      const path = `courses/${courseId}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
      const { error: uploadError } = await createClient()
        .storage.from(COVERS_BUCKET)
        .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
      if (uploadError) {
        setError("No se pudo subir la imagen.");
        return;
      }
      const result = await setCourseCover(courseId, path);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="bg-muted relative flex aspect-video w-full max-w-md items-center justify-center overflow-hidden rounded-lg border">
        {coverUrl ? (
          <Image src={coverUrl} alt="Portada del curso" fill sizes="448px" className="object-cover" />
        ) : (
          <span className="text-muted-foreground text-sm">Sin portada</span>
        )}
        {pending && (
          <div className="bg-background/70 absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus /> {coverUrl ? "Cambiar portada" : "Subir portada"}
        </Button>
        {coverUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => startTransition(() => removeCourseCover(courseId))}
          >
            <Trash2 /> Quitar
          </Button>
        )}
      </div>
      <p className="text-muted-foreground text-xs">JPG, PNG o WebP, hasta 5 MB. Recomendado 1280 × 720.</p>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={COVER_TYPES.join(",")}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) upload(file);
        }}
      />
    </div>
  );
}
