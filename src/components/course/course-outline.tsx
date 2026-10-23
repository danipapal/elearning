import Link from "next/link";
import { CheckCircle2, Circle, Eye, FileText, Layers, Lock, PlayCircle, Type } from "lucide-react";

import { formatTotalDuration, formatUnlockDate, type OutlineModule } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import type { LessonType } from "@/types/database";

const ICONS: Record<LessonType, React.ComponentType<{ className?: string }>> = {
  video: PlayCircle,
  text: Type,
  pdf: FileText,
  mixed: Layers,
  quiz: FileText,
};

// Temario del curso. Se usa en la página pública y en el índice lateral del
// reproductor (compact).
export function CourseOutline({
  modules,
  slug,
  currentLessonId,
  showProgress,
  compact,
}: {
  modules: OutlineModule[];
  slug: string;
  currentLessonId?: string;
  showProgress: boolean;
  compact?: boolean;
}) {
  return (
    <ol className={cn("grid", compact ? "gap-4" : "gap-3")}>
      {modules.map((courseModule, index) => (
        <li key={courseModule.id} className={cn(!compact && "rounded-lg border")}>
          <div className={cn(compact ? "px-1 pb-1" : "border-b px-4 py-3")}>
            <p className={cn("font-medium", compact && "text-sm")}>
              <span className="text-muted-foreground">Módulo {index + 1}:</span> {courseModule.title}
            </p>
            {showProgress && courseModule.locked && courseModule.unlockAt && (
              <p className="text-muted-foreground text-xs">
                Se habilita el {formatUnlockDate(courseModule.unlockAt)}
              </p>
            )}
            {!showProgress && courseModule.releaseAfterDays > 0 && (
              <p className="text-muted-foreground text-xs">
                Se habilita {courseModule.releaseAfterDays} días después de inscribirte
              </p>
            )}
          </div>
          <ul className={cn(!compact && "divide-y")}>
            {courseModule.lessons.map((lesson) => {
              const Icon = ICONS[lesson.type];
              const current = lesson.id === currentLessonId;
              const duration = formatTotalDuration(lesson.durationSeconds ?? 0);
              const content = (
                <>
                  {showProgress ? (
                    lesson.completed ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-label="Completada" />
                    ) : lesson.accessible ? (
                      <Circle className="text-muted-foreground size-4 shrink-0" aria-hidden />
                    ) : (
                      <Lock className="text-muted-foreground size-4 shrink-0" aria-label="Bloqueada" />
                    )
                  ) : (
                    <Icon className="text-muted-foreground size-4 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1">{lesson.title}</span>
                  {!showProgress && lesson.isPreview && (
                    <span className="text-primary flex shrink-0 items-center gap-1 text-xs font-medium">
                      <Eye className="size-3" /> Vista previa
                    </span>
                  )}
                  {duration && <span className="text-muted-foreground shrink-0 text-xs">{duration}</span>}
                </>
              );
              const className = cn(
                "flex items-center gap-3 text-sm",
                compact ? "rounded-md px-2 py-1.5" : "px-4 py-2.5",
                current && "bg-accent font-medium",
              );
              return (
                <li key={lesson.id}>
                  {lesson.accessible ? (
                    <Link
                      href={`/cursos/${slug}/lecciones/${lesson.id}`}
                      aria-current={current ? "page" : undefined}
                      className={cn(className, "hover:bg-accent")}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className={cn(className, "text-muted-foreground")}>{content}</div>
                  )}
                </li>
              );
            })}
            {courseModule.lessons.length === 0 && (
              <li className="text-muted-foreground px-4 py-2.5 text-sm">Próximamente</li>
            )}
          </ul>
        </li>
      ))}
    </ol>
  );
}
