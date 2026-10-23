import { z } from "zod";

import { SLUG_PATTERN } from "@/lib/slug";
import { parseVideoUrl } from "@/lib/video";

const optionalVideoUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === "" || parseVideoUrl(value) !== null, {
    error: "Pegá un enlace válido de YouTube o Vimeo.",
  });

// Textarea con un elemento por línea -> array sin líneas vacías.
const lines = z
  .string()
  .max(5000)
  .transform((value) =>
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 30),
  );

const faqs = z
  .string()
  .default("[]")
  .transform((value, ctx) => {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "Preguntas frecuentes inválidas." });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .array(
        z.object({
          question: z.string().trim().max(300),
          answer: z.string().trim().max(3000),
        }),
      )
      .max(30)
      .transform((items) => items.filter((item) => item.question && item.answer)),
  );

export const slugSchema = z
  .string()
  .trim()
  .min(1, { error: "Ingresá un slug." })
  .max(150)
  .regex(SLUG_PATTERN, { error: "Solo minúsculas, números y guiones (ej: mi-curso)." });

export const newCourseSchema = z.object({
  title: z.string().trim().min(3, { error: "El título es muy corto." }).max(160),
});

export const courseSchema = z.object({
  title: z.string().trim().min(3, { error: "El título es muy corto." }).max(160),
  slug: slugSchema,
  shortDescription: z.string().trim().max(300, { error: "Máximo 300 caracteres." }),
  description: z.string().max(50000),
  introVideoUrl: optionalVideoUrl,
  categoryId: z.union([z.literal(""), z.uuid()]),
  level: z.enum(["all", "beginner", "intermediate", "advanced"]),
  language: z.string().trim().min(2).max(10),
  instructorId: z.union([z.literal(""), z.uuid()]),
  requirements: lines,
  learningObjectives: lines,
  faqs,
  accessType: z.enum(["free", "paid", "membership", "invite"]),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, { error: "El nombre es muy corto." }).max(80),
});

export const moduleSchema = z.object({
  title: z.string().trim().min(1, { error: "Ingresá un título." }).max(160),
  releaseAfterDays: z.coerce
    .number({ error: "Ingresá un número." })
    .int()
    .min(0, { error: "No puede ser negativo." })
    .max(3650),
});

export const newLessonSchema = z.object({
  title: z.string().trim().min(1, { error: "Ingresá un título." }).max(160),
  type: z.enum(["video", "text", "pdf", "mixed"]),
});

export const lessonSchema = z
  .object({
    title: z.string().trim().min(1, { error: "Ingresá un título." }).max(160),
    type: z.enum(["video", "text", "pdf", "mixed"]),
    moduleId: z.uuid(),
    videoUrl: optionalVideoUrl,
    durationMinutes: z.coerce
      .number({ error: "Ingresá un número." })
      .min(0)
      .max(1440)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    content: z.string().max(100000),
    isPreview: z.literal("on").optional(),
  })
  .refine((data) => data.type !== "video" || data.videoUrl !== "", {
    error: "Una lección de video necesita el enlace del video.",
    path: ["videoUrl"],
  });

export const attachmentSchema = z.object({
  lessonId: z.uuid(),
  path: z.string().min(1).max(300),
  fileName: z.string().trim().min(1).max(200),
  sizeBytes: z.coerce.number().int().min(0).max(50 * 1024 * 1024),
});
