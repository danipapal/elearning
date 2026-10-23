"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { enroll } from "@/app/cursos/actions";
import { Button } from "@/components/ui/button";

export function EnrollButton({ courseId, slug }: { courseId: string; slug: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-2">
      <Button
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await enroll(courseId, slug);
            if (result?.error) setError(result.error);
          })
        }
      >
        {pending && <Loader2 className="animate-spin" />}
        Inscribirme gratis
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
