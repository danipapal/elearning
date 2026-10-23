"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { setCertificateImage } from "@/app/admin/certificados/actions";
import { Button } from "@/components/ui/button";
import { COVERS_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

const TYPES: Record<string, "png" | "jpg"> = { "image/png": "png", "image/jpeg": "jpg" };
const MAX_BYTES = 2 * 1024 * 1024;

// Logo o firma del certificado. Solo PNG o JPG (el PDF no admite WebP).
export function BrandingUpload({
  kind,
  label,
  hint,
  imageUrl,
}: {
  kind: "logo" | "signature";
  label: string;
  hint: string;
  imageUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function upload(file: File) {
    setError(null);
    const extension = TYPES[file.type];
    if (!extension) return setError("Tiene que ser PNG o JPG.");
    if (file.size > MAX_BYTES) return setError("La imagen supera los 2 MB.");
    startTransition(async () => {
      const path = `branding/${kind}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await createClient()
        .storage.from(COVERS_BUCKET)
        .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
      if (uploadError) return setError("No se pudo subir la imagen.");
      const result = await setCertificateImage(kind, path);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="bg-muted relative flex h-24 w-full max-w-xs items-center justify-center overflow-hidden rounded-lg border">
        {imageUrl ? (
          <Image src={imageUrl} alt={label} fill sizes="320px" className="object-contain p-2" />
        ) : (
          <span className="text-muted-foreground text-sm">Sin imagen</span>
        )}
        {pending && (
          <div className="bg-background/70 absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}
      </div>
      <p className="text-muted-foreground text-xs">{hint}</p>
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          aria-label={label}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) upload(file);
            event.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => inputRef.current?.click()}>
          <ImagePlus /> {imageUrl ? "Cambiar" : "Subir"}
        </Button>
        {imageUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => startTransition(async () => void (await setCertificateImage(kind, null)))}
          >
            <Trash2 /> Quitar
          </Button>
        )}
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
