import { z } from "zod";

// Fecha opcional (input type="date"). Vacía = sin vencimiento.
const expiresAt = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), { error: "Fecha inválida." })
  .refine((value) => value === "" || new Date(`${value}T23:59:59-03:00`) > new Date(), {
    error: "La fecha de vencimiento tiene que ser futura.",
  })
  .transform((value) => (value === "" ? null : `${value}T23:59:59-03:00`));

export const enrollSchema = z.object({
  userId: z.guid(),
  courseId: z.guid({ error: "Elegí un curso." }),
  expiresAt,
});

export const bulkEnrollSchema = z.object({
  courseId: z.guid({ error: "Elegí un curso." }),
  expiresAt,
});

const emailPattern = /^[^\s@;,"<>]+@[^\s@;,"<>]+\.[^\s@;,"<>]+$/;

// Saca los emails de un CSV o lista: toma cualquier celda que parezca email.
export function extractEmails(text: string) {
  const emails = new Set<string>();
  for (const cell of text.split(/[\s,;"]+/)) {
    const value = cell.trim().toLowerCase();
    if (value.length <= 254 && emailPattern.test(value)) emails.add(value);
  }
  return [...emails];
}
