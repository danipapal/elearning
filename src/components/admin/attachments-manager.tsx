"use client";

import { useConfirm } from "@/components/admin/confirm-dialog";
import { useRef, useState, useTransition } from "react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";

import { addAttachment, deleteAttachment } from "@/app/admin/cursos/actions";
import { Button } from "@/components/ui/button";
import { FILES_BUCKET, MAX_PDF_BYTES, formatBytes } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

type Attachment = { id: string; file_name: string; size_bytes: number };

function safeFileName(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\.pdf$/i, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .slice(0, 80) || "archivo"
  );
}

export function AttachmentsManager({
  lessonId,
  attachments,
}: {
  lessonId: string;
  attachments: Attachment[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  function upload(file: File) {
    setError(null);
    if (file.type !== "application/pdf" || !/\.pdf$/i.test(file.name)) {
      setError("Solo se aceptan archivos PDF.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setError("El PDF supera los 50 MB.");
      return;
    }
    startTransition(async () => {
      const path = `lessons/${lessonId}/${crypto.randomUUID()}-${safeFileName(file.name)}.pdf`;
      const { error: uploadError } = await createClient()
        .storage.from(FILES_BUCKET)
        .upload(path, file, { contentType: "application/pdf" });
      if (uploadError) {
        setError("No se pudo subir el archivo.");
        return;
      }
      const result = await addAttachment({
        lessonId,
        path,
        fileName: file.name.slice(0, 200),
        sizeBytes: file.size,
      });
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {attachments.length > 0 ? (
        <ul className="divide-y rounded-md border">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <FileText className="text-muted-foreground size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{attachment.file_name}</span>
              <span className="text-muted-foreground shrink-0">{formatBytes(attachment.size_bytes)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Eliminar ${attachment.file_name}`}
                disabled={pending}
                onClick={async () => {
                  if (!(await confirm(`¿Eliminar "${attachment.file_name}"?`))) return;
                  startTransition(() => deleteAttachment(attachment.id));
                }}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">Todavía no hay archivos.</p>
      )}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? <Loader2 className="animate-spin" /> : <Upload />} Subir PDF
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Solo PDF, hasta 50 MB. Se guardan en un depósito privado: los alumnos los descargan con enlaces temporales.
      </p>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
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
