"use client";

import { useOptimistic, useTransition } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

import { setLessonCompleted } from "@/app/cursos/actions";
import { Button } from "@/components/ui/button";

export function CompleteButton({ lessonId, completed }: { lessonId: string; completed: boolean }) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(completed);

  return (
    <Button
      type="button"
      variant={optimistic ? "secondary" : "default"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          await setLessonCompleted(lessonId, !optimistic);
        })
      }
    >
      {pending ? (
        <Loader2 className="animate-spin" />
      ) : optimistic ? (
        <CheckCircle2 className="text-emerald-600" />
      ) : (
        <Circle />
      )}
      {optimistic ? "Completada" : "Marcar como completada"}
    </Button>
  );
}
