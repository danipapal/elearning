import { z } from "zod";

const option = z.object({
  label: z.string().trim().min(1, { error: "Completá el texto de cada opción." }).max(500),
  is_correct: z.boolean(),
});

const question = z
  .object({
    type: z.enum(["single", "multiple", "true_false"]),
    prompt: z.string().trim().min(1, { error: "Escribí la pregunta." }).max(1000),
    explanation: z.string().trim().max(1000),
    options: z.array(option).min(2, { error: "Cada pregunta necesita al menos 2 opciones." }).max(10),
  })
  .superRefine((value, ctx) => {
    const correct = value.options.filter((item) => item.is_correct).length;
    if (correct === 0) {
      ctx.addIssue({ code: "custom", message: "Marcá la respuesta correcta.", path: ["options"] });
    } else if (value.type !== "multiple" && correct > 1) {
      ctx.addIssue({ code: "custom", message: "Solo una opción puede ser correcta.", path: ["options"] });
    }
    if (value.type === "true_false" && value.options.length !== 2) {
      ctx.addIssue({ code: "custom", message: "Verdadero/falso tiene exactamente 2 opciones.", path: ["options"] });
    }
  });

export const quizSchema = z.object({
  passing_score: z.coerce
    .number()
    .int({ error: "La nota mínima tiene que ser un número entero." })
    .min(0, { error: "La nota mínima tiene que estar entre 0 y 100." })
    .max(100, { error: "La nota mínima tiene que estar entre 0 y 100." }),
  max_attempts: z.coerce
    .number()
    .int({ error: "Los intentos tienen que ser un número entero." })
    .min(1, { error: "Los intentos tienen que ser entre 1 y 100." })
    .max(100, { error: "Los intentos tienen que ser entre 1 y 100." })
    .nullable(),
  questions: z.array(question).min(1, { error: "Agregá al menos una pregunta." }).max(100),
});

export type QuizInput = z.infer<typeof quizSchema>;
