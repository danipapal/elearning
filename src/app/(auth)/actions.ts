"use server";

import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { z } from "zod";

import { safeNextPath } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  newPasswordSchema,
  registerSchema,
  type FormState,
} from "@/lib/validation/auth";

function authErrorMessage(error: AuthError) {
  // Queda en los logs del servidor (Render > Logs) para poder diagnosticar.
  console.error("[auth]", error.status, error.code, error.message);
  switch (error.code) {
    case "invalid_credentials":
      return "Email o contraseña incorrectos.";
    case "email_not_confirmed":
      return "Todavía no confirmaste tu email. Revisá tu bandeja de entrada (y la carpeta de spam).";
    case "weak_password":
      return "La contraseña es demasiado débil. Probá con una más larga.";
    case "same_password":
      return "La nueva contraseña tiene que ser distinta de la anterior.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Demasiados intentos. Esperá unos minutos y volvé a probar.";
    case "user_banned":
      return "Tu cuenta está suspendida. Escribinos si creés que es un error.";
    default:
      return "Ocurrió un error. Volvé a intentar en unos minutos.";
  }
}

function fieldErrors(error: z.ZodError) {
  return z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error), values };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: authErrorMessage(error), values };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error), values };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/mi-aprendizaje`,
    },
  });
  if (error) {
    return { error: authErrorMessage(error), values };
  }

  // Mismo mensaje exista o no la cuenta, para no revelar qué emails están registrados.
  return {
    success:
      "¡Listo! Te enviamos un email para confirmar tu cuenta. Abrí el enlace y después iniciá sesión.",
  };
}

export async function forgotPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error), values };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/nueva-contrasena`,
  });
  if (error && error.code?.startsWith("over_")) {
    return { error: authErrorMessage(error), values };
  }

  return {
    success:
      "Si existe una cuenta con ese email, te enviamos un enlace para crear una nueva contraseña.",
  };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "El enlace venció. Pedí uno nuevo desde “Olvidé mi contraseña”." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: authErrorMessage(error) };
  }

  redirect("/mi-aprendizaje?password=actualizada");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
