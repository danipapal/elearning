import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Ingresá un email válido." }));

export const contactSchema = z.object({
  name: z.string().trim().min(2, { error: "Ingresá tu nombre." }).max(120, { error: "El nombre es demasiado largo." }),
  email,
  message: z
    .string()
    .trim()
    .min(10, { error: "Contanos un poco más (mínimo 10 caracteres)." })
    .max(5000, { error: "El mensaje puede tener como máximo 5000 caracteres." }),
});

const url = (label: string) =>
  z
    .string()
    .trim()
    .max(300)
    .refine((value) => value === "" || /^https:\/\/[^\s]+$/.test(value), {
      error: `El enlace de ${label} tiene que empezar con https://`,
    });

export const siteSettingsSchema = z.object({
  site_name: z.string().trim().min(1, { error: "Ingresá el nombre del sitio." }).max(60),
  description: z.string().trim().max(200, { error: "Máximo 200 caracteres." }),
  primary_color: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^#[0-9a-f]{6}$/, { error: "Elegí un color válido." }),
  contact_email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => value === "" || z.email().safeParse(value).success, { error: "Ingresá un email válido." }),
  instagram_url: url("Instagram"),
  facebook_url: url("Facebook"),
  youtube_url: url("YouTube"),
  tiktok_url: url("TikTok"),
  x_url: url("X"),
  linkedin_url: url("LinkedIn"),
  whatsapp: z
    .string()
    .transform((value) => value.replace(/[\s()+-]/g, ""))
    .pipe(z.string().regex(/^[0-9]{0,15}$/, { error: "Solo números, con código de país (ej: 5491112345678)." })),
});

export const legalSchema = z.object({
  kind: z.enum(["terms", "privacy"]),
  html: z.string().max(100000, { error: "El texto es demasiado largo." }),
});

export const emailTemplateSchema = z.object({
  key: z.enum(["welcome", "certificate"]),
  subject: z.string().trim().min(1, { error: "Ingresá el asunto." }).max(150, { error: "Máximo 150 caracteres." }),
  body_html: z.string().max(20000, { error: "El texto es demasiado largo." }),
  button_label: z.string().trim().max(40, { error: "Máximo 40 caracteres." }),
  enabled: z.literal("on").optional(),
});

export const announcementSchema = z.object({
  subject: z.string().trim().min(1, { error: "Ingresá el asunto." }).max(150, { error: "Máximo 150 caracteres." }),
  body_html: z.string().max(50000, { error: "El texto es demasiado largo." }),
  course_id: z.union([z.literal(""), z.guid()]),
});
