import Image from "next/image";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { LEVEL_LABELS } from "@/lib/courses";
import { coverUrl } from "@/lib/storage";
import type { CourseLevel } from "@/types/database";

export type CourseCardData = {
  slug: string;
  title: string;
  short_description: string;
  cover_path: string | null;
  level: CourseLevel;
  categories: { name: string } | null;
};

export function CourseCard({ course }: { course: CourseCardData }) {
  const cover = coverUrl(course.cover_path);
  return (
    <Link
      href={`/cursos/${course.slug}`}
      className="group bg-card flex flex-col overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="bg-muted relative aspect-video">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="text-muted-foreground flex size-full items-center justify-center">
            <GraduationCap className="size-10" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap gap-1.5">
          {course.categories && <Badge variant="secondary">{course.categories.name}</Badge>}
          <Badge variant="outline">{LEVEL_LABELS[course.level]}</Badge>
        </div>
        <h3 className="leading-snug font-semibold group-hover:underline">{course.title}</h3>
        {course.short_description && (
          <p className="text-muted-foreground line-clamp-3 text-sm">{course.short_description}</p>
        )}
        <p className="text-primary mt-auto pt-2 text-sm font-medium">Gratis</p>
      </div>
    </Link>
  );
}
