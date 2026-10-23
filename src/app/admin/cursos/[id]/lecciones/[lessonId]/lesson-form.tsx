"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteLesson, updateLesson } from "@/app/admin/cursos/actions";
import { AttachmentsManager } from "@/components/admin/attachments-manager";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { FormField, FormStatus, SaveButton, useFormAction } from "@/components/admin/form-fields";
import { QuizEditor } from "@/components/admin/quiz-editor";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { parseVideoUrl } from "@/lib/video";
import type { AdminQuiz, Database, LessonType } from "@/types/database";

type Lesson = Database["public"]["Tables"]["lessons"]["Row"];

const TYPE_HELP: Record<string, string> = {
  video: "Un video de YouTube o Vimeo, con un resumen opcional.",
  text: "Contenido escrito con el editor.",
  pdf: "Material para descargar, con una explicación opcional.",
  mixed: "Video, texto y archivos juntos.",
  quiz: "Preguntas con corrección automática. Armalo abajo y guardalo.",
};

function VideoPreview({ url }: { url: string }) {
  const video = parseVideoUrl(url);
  if (!url) return null;
  if (!video) {
    return <p className="text-destructive text-sm">No reconozco ese enlace como YouTube o Vimeo.</p>;
  }
  return (
    <div className="bg-muted relative aspect-video w-full max-w-xl overflow-hidden rounded-lg">
      <iframe
        src={video.embedUrl}
        title="Vista previa del video"
        className="absolute inset-0 size-full"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
      />
    </div>
  );
}

export function LessonForm({
  lesson,
  modules,
  attachments,
  quiz,
}: {
  lesson: Lesson;
  modules: { id: string; title: string }[];
  attachments: { id: string; file_name: string; size_bytes: number }[];
  quiz: AdminQuiz | null;
}) {
  const { state, onSubmit, pending } = useFormAction(updateLesson.bind(null, lesson.id));
  const [type, setType] = useState<LessonType>(lesson.type);
  const [videoUrl, setVideoUrl] = useState(lesson.video_url ?? "");
  const [deleting, startDelete] = useTransition();
  const confirm = useConfirm();
  const usesVideo = type === "video" || type === "mixed";
  const usesFiles = type === "pdf" || type === "mixed";

  return (
    <div className="grid grid-cols-1 gap-8">
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField name="title" label="Título de la lección" state={state} className="sm:col-span-2">
            <Input id="title" name="title" defaultValue={lesson.title} required maxLength={160} />
          </FormField>
          <FormField name="type" label="Tipo de lección" hint={TYPE_HELP[type]} state={state}>
            <NativeSelect
              id="type"
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value as LessonType)}
            >
              <option value="video">Video</option>
              <option value="text">Texto</option>
              <option value="pdf">PDF</option>
              <option value="mixed">Mixta (video + texto + archivos)</option>
              <option value="quiz">Cuestionario</option>
            </NativeSelect>
          </FormField>
          <FormField name="moduleId" label="Módulo" state={state}>
            <NativeSelect id="moduleId" name="moduleId" defaultValue={lesson.module_id}>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        </div>

        {usesVideo && (
          <div className="grid grid-cols-1 gap-4">
            <FormField
              name="videoUrl"
              label="Enlace del video"
              hint="YouTube (puede ser no listado) o Vimeo. Se convierte solo en reproductor."
              state={state}
            >
              <Input
                id="videoUrl"
                name="videoUrl"
                type="url"
                value={videoUrl}
                onChange={(event) => setVideoUrl(event.target.value.trim())}
                placeholder="https://vimeo.com/123456789"
              />
            </FormField>
            <VideoPreview url={videoUrl} />
          </div>
        )}
        {!usesVideo && <input type="hidden" name="videoUrl" value="" />}

        <FormField name="durationMinutes" label="Duración (minutos)" hint="Opcional. Se usa para calcular la duración total del curso." state={state} className="max-w-48">
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={0}
            max={1440}
            step="any"
            defaultValue={lesson.duration_seconds ? Math.round(lesson.duration_seconds / 60) : ""}
          />
        </FormField>

        <FormField
          name="content"
          label={type === "text" ? "Contenido" : type === "quiz" ? "Instrucciones (opcional)" : "Resumen o explicación"}
          state={state}
        >
          <RichTextEditor name="content" defaultValue={lesson.content} />
        </FormField>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="isPreview"
            defaultChecked={lesson.is_preview}
            className="mt-0.5 size-4"
          />
          <span>
            <span className="font-medium">Vista previa gratuita</span>
            <span className="text-muted-foreground block">
              Cualquier visitante puede ver esta lección sin registrarse.
            </span>
          </span>
        </label>

        <div className="bg-background/95 sticky bottom-0 -mx-4 grid gap-3 border-t px-4 py-3 backdrop-blur">
          <FormStatus state={state} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SaveButton pending={pending}>Guardar lección</SaveButton>
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              disabled={deleting}
              onClick={async () => {
                if (await confirm("¿Eliminar esta lección y sus archivos? No se puede deshacer.")) {
                  startDelete(() => deleteLesson(lesson.id));
                }
              }}
            >
              <Trash2 /> Eliminar lección
            </Button>
          </div>
        </div>
      </form>

      {type === "quiz" && <QuizEditor lessonId={lesson.id} quiz={quiz} />}

      {(usesFiles || attachments.length > 0) && (
        <section className="grid grid-cols-1 gap-3">
          <h2 className="text-lg font-semibold">Archivos descargables</h2>
          <AttachmentsManager lessonId={lesson.id} attachments={attachments} />
        </section>
      )}
    </div>
  );
}
