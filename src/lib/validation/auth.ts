import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Ingresá un email válido." }));

const password = z
  .string()
  .min(8, { error: "La contraseña debe tener al menos 8 caracteres." })
  .max(72, { error: "La contraseña puede tener como máximo 72 caracteres." })
  .regex(/[A-Za-z]/, { error: "La contraseña debe incluir al menos una letra." })
  .regex(/[0-9]/, { error: "La contraseña debe incluir al menos un número." });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Ingresá tu contraseña." }).max(72),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, { error: "Ingresá tu nombre." })
      .max(120, { error: "El nombre es demasiado largo." }),
    email,
    password,
    confirmPassword: z.string(),
    acceptTerms: z.literal("on", {
      error: "Tenés que aceptar los términos y la política de privacidad.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

export const newPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type { FormState } from "@/lib/validation/form";
