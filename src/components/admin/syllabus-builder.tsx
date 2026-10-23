"use client";

import { useConfirm } from "@/components/admin/confirm-dialog";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, FileText, GripVertical, Layers, Pencil, PlayCircle, Plus, Trash2, Type } from "lucide-react";

import {
  createLesson,
  createModule,
  deleteModule,
  reorderLessons,
  reorderModules,
  updateModule,
} from "@/app/admin/cursos/actions";
import { FormField, FormStatus, SaveButton } from "@/components/admin/form-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/validation/form";
import type { LessonType } from "@/types/database";

export type SyllabusLesson = {
  id: string;
  title: string;
  type: LessonType;
  is_preview: boolean;
  duration_seconds: number | null;
};

export type SyllabusModule = {
  id: string;
  title: string;
  release_after_days: number;
  lessons: SyllabusLesson[];
};

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  video: "Video",
  text: "Texto",
  pdf: "PDF",
  mixed: "Mixta",
  quiz: "Cuestionario",
};

const LESSON_ICONS: Record<LessonType, React.ComponentType<{ className?: string }>> = {
  video: PlayCircle,
  text: Type,
  pdf: FileText,
  mixed: Layers,
  quiz: FileText,
};

// Mantiene un estado local (para mover sin esperar al servidor) que se
// resincroniza cuando llegan datos nuevos del servidor.
function useSyncedState<T>(value: T) {
  const [state, setState] = useState(value);
  const [previous, setPrevious] = useState(value);
  if (value !== previous) {
    setPrevious(value);
    setState(value);
  }
  return [state, setState] as const;
}

function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

function DragHandle(props: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className="text-muted-foreground hover:text-foreground cursor-grab touch-none rounded p-1 active:cursor-grabbing"
      {...props}
    >
      <GripVertical className="size-4" />
    </button>
  );
}

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function LessonRow({ lesson, courseId }: { lesson: SyllabusLesson; courseId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
  });
  const Icon = LESSON_ICONS[lesson.type];
  const duration = formatDuration(lesson.duration_seconds);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "bg-background flex items-center gap-2 px-2 py-2",
        isDragging && "relative z-10 shadow-md",
      )}
    >
      <DragHandle aria-label={`Mover lección ${lesson.title}`} {...attributes} {...listeners} />
      <Icon className="text-muted-foreground size-4 shrink-0" />
      <Link
        href={`/admin/cursos/${courseId}/lecciones/${lesson.id}`}
        className="min-w-0 flex-1 truncate text-sm hover:underline"
      >
        {lesson.title}
      </Link>
      {lesson.is_preview && (
        <Badge variant="secondary" className="hidden sm:inline-flex">
          <Eye className="size-3" /> Vista previa
        </Badge>
      )}
      {duration && <span className="text-muted-foreground hidden text-xs sm:inline">{duration}</span>}
      <Button asChild variant="ghost" size="icon" aria-label={`Editar ${lesson.title}`}>
        <Link href={`/admin/cursos/${courseId}/lecciones/${lesson.id}`}>
          <Pencil />
        </Link>
      </Button>
    </li>
  );
}

function NewLessonForm({ moduleId, onDone }: { moduleId: string; onDone: () => void }) {
  const [state, action] = useActionState<FormState, FormData>(createLesson.bind(null, moduleId), {});
  return (
    <form action={action} className="grid gap-3 border-t p-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
      <FormField name="title" label="Título de la lección" state={state}>
        <Input id="title" name="title" required maxLength={160} autoFocus />
      </FormField>
      <FormField name="type" label="Tipo" state={state}>
        <NativeSelect id="type" name="type" defaultValue="video">
          <option value="video">Video</option>
          <option value="text">Texto</option>
          <option value="pdf">PDF</option>
          <option value="mixed">Mixta</option>
        </NativeSelect>
      </FormField>
      <div className="flex gap-2">
        <SaveButton>Crear</SaveButton>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
      {state.error && <p className="text-destructive text-sm sm:col-span-3">{state.error}</p>}
    </form>
  );
}

function ModuleEditForm({ module, onDone }: { module: SyllabusModule; onDone: () => void }) {
  const [state, action] = useActionState<FormState, FormData>(
    async (prev, formData) => {
      const result = await updateModule(module.id, prev, formData);
      if (result.success) onDone();
      return result;
    },
    {},
  );
  return (
    <form action={action} className="grid gap-3 border-b p-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
      <FormField name="title" label="Título del módulo" state={state}>
        <Input id="title" name="title" defaultValue={module.title} required maxLength={160} />
      </FormField>
      <FormField name="releaseAfterDays" label="Liberar a los (días)" state={state}>
        <Input
          id="releaseAfterDays"
          name="releaseAfterDays"
          type="number"
          min={0}
          max={3650}
          defaultValue={module.release_after_days}
        />
      </FormField>
      <div className="flex gap-2">
        <SaveButton />
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function ModuleCard({
  module,
  index,
  courseId,
}: {
  module: SyllabusModule;
  index: number;
  courseId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
  });
  const [lessons, setLessons] = useSyncedState(module.lessons);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const sensors = useDndSensors();

  function onLessonDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = lessons.findIndex((lesson) => lesson.id === active.id);
    const to = lessons.findIndex((lesson) => lesson.id === over.id);
    const next = arrayMove(lessons, from, to);
    setLessons(next);
    startTransition(() => reorderLessons(module.id, next.map((lesson) => lesson.id)));
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("bg-card rounded-lg border", isDragging && "relative z-10 shadow-lg")}
    >
      <div className="flex items-center gap-2 border-b px-2 py-2">
        <DragHandle aria-label={`Mover módulo ${module.title}`} {...attributes} {...listeners} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            <span className="text-muted-foreground">Módulo {index + 1}:</span> {module.title}
          </p>
          {module.release_after_days > 0 && (
            <p className="text-muted-foreground text-xs">
              Se libera {module.release_after_days} días después de la inscripción
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Editar módulo ${module.title}`}
          onClick={() => setEditing((value) => !value)}
        >
          <Pencil />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Eliminar módulo ${module.title}`}
          disabled={pending}
          onClick={async () => {
            const message =
              lessons.length > 0
                ? `¿Eliminar el módulo "${module.title}" y sus ${lessons.length} lecciones? No se puede deshacer.`
                : `¿Eliminar el módulo "${module.title}"?`;
            if (await confirm(message)) startTransition(() => deleteModule(module.id));
          }}
        >
          <Trash2 />
        </Button>
      </div>

      {editing && <ModuleEditForm module={module} onDone={() => setEditing(false)} />}

      {lessons.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onLessonDragEnd}>
          <SortableContext items={lessons.map((lesson) => lesson.id)} strategy={verticalListSortingStrategy}>
            <ul className="divide-y">
              {lessons.map((lesson) => (
                <LessonRow key={lesson.id} lesson={lesson} courseId={courseId} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-muted-foreground px-4 py-3 text-sm">Este módulo todavía no tiene lecciones.</p>
      )}

      {adding ? (
        <NewLessonForm moduleId={module.id} onDone={() => setAdding(false)} />
      ) : (
        <div className="border-t p-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <Plus /> Agregar lección
          </Button>
        </div>
      )}
    </li>
  );
}

function NewModuleForm({ courseId }: { courseId: string }) {
  const [state, action] = useActionState<FormState, FormData>(createModule.bind(null, courseId), {});
  return (
    <form
      action={action}
      className="bg-muted/40 grid gap-3 rounded-lg border border-dashed p-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end"
    >
      <FormField name="title" label="Nuevo módulo" state={state}>
        <Input id="title" name="title" placeholder="Ej: Introducción" required maxLength={160} />
      </FormField>
      <FormField name="releaseAfterDays" label="Liberar a los (días)" hint="0 = disponible enseguida" state={state}>
        <Input id="releaseAfterDays" name="releaseAfterDays" type="number" min={0} max={3650} defaultValue={0} />
      </FormField>
      <SaveButton>
        <Plus /> Agregar módulo
      </SaveButton>
      {state.error && <FormStatus state={state} />}
    </form>
  );
}

export function SyllabusBuilder({
  courseId,
  modules: initialModules,
}: {
  courseId: string;
  modules: SyllabusModule[];
}) {
  const [modules, setModules] = useSyncedState(initialModules);
  const [, startTransition] = useTransition();
  const sensors = useDndSensors();

  function onModuleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = modules.findIndex((module) => module.id === active.id);
    const to = modules.findIndex((module) => module.id === over.id);
    const next = arrayMove(modules, from, to);
    setModules(next);
    startTransition(() => reorderModules(courseId, next.map((module) => module.id)));
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {modules.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onModuleDragEnd}>
          <SortableContext items={modules.map((module) => module.id)} strategy={verticalListSortingStrategy}>
            <ol className="grid grid-cols-1 gap-4">
              {modules.map((module, index) => (
                <ModuleCard key={module.id} module={module} index={index} courseId={courseId} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-muted-foreground text-sm">
          Empezá creando el primer módulo. Después le agregás lecciones.
        </p>
      )}
      <NewModuleForm courseId={courseId} />
    </div>
  );
}
