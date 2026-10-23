"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { createStatelessClient } from "@/lib/supabase/stateless";
import { createClient } from "@/lib/supabase/server";
import { bulkEnrollSchema, enrollSchema, extractEmails } from "@/lib/validation/users";
import { fieldErrors, type FormState } from "@/lib/validation/form";
import type { UserRole, UserStatus } from "@/types/database";

export type ActionResult = { error?: string; success?: string };

const uuid = z.guid();
const roleSchema = z.enum(["superadmin", "admin", "instructor", "student"]);
const statusSchema = z.enum(["active", "suspended"]);

// Los mensajes de las funciones de la base (permisos, usuario inexistente)
// ya están en español y se pueden mostrar; el resto se registra y se oculta.
function rpcError(error: PostgrestError) {
  if (["42501", "P0002", "22023"].includes(error.code)) return error.message;
  console.error("[admin]", error.code, error.message);
  return "No se pudo completar la acción. Volvé a intentar.";
}

export async function setUserRole(userId: string, role: UserRole): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(userId).success || !roleSchema.safeParse(role).success) {
    return { error: "Datos inválidos." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", { p_user_id: userId, p_role: role });
  if (error) return { error: rpcError(error) };
  refresh();
  return { success: "Rol actualizado." };
}

export async function setUserStatus(userId: string, status: UserStatus): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(userId).success || !statusSchema.safeParse(status).success) {
    return { error: "Datos inválidos." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_status", { p_user_id: userId, p_status: status });
  if (error) return { error: rpcError(error) };
  refresh();
  return { success: status === "suspended" ? "Cuenta suspendida." : "Cuenta reactivada." };
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(userId).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_user", { p_user_id: userId });
  if (error) return { error: rpcError(error) };
  redirect("/admin/usuarios?mensaje=eliminado");
}

// Busca el usuario en la base (no se confía en un email que mande el navegador).
async function getUser(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_get_user", { p_user_id: userId });
  return data?.[0] ?? null;
}

function emailError(error: { code?: string; message: string }) {
  console.error("[admin:email]", error.code, error.message);
  if (error.code?.startsWith("over_")) {
    return "Supabase limita los envíos: esperá un minuto y volvé a probar. Si sigue fallando, se alcanzó el límite de emails por hora.";
  }
  return "No se pudo enviar el email. Volvé a intentar en unos minutos.";
}

export async function resendVerification(userId: string): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(userId).success) return { error: "Datos inválidos." };
  const user = await getUser(userId);
  if (!user) return { error: "El usuario no existe." };
  if (user.email_confirmed_at) return { error: "Este usuario ya confirmó su email." };

  const { error } = await createStatelessClient().auth.resend({
    type: "signup",
    email: user.email,
    options: { emailRedirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/mi-aprendizaje` },
  });
  if (error) return { error: emailError(error) };
  return { success: `Le enviamos de nuevo el email de verificación a ${user.email}.` };
}

export async function sendPasswordReset(userId: string): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(userId).success) return { error: "Datos inválidos." };
  const user = await getUser(userId);
  if (!user) return { error: "El usuario no existe." };

  const { error } = await createStatelessClient().auth.resetPasswordForEmail(user.email, {
    redirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/nueva-contrasena`,
  });
  if (error) return { error: emailError(error) };
  return { success: `Le enviamos a ${user.email} un enlace para crear una contraseña nueva.` };
}

export async function enrollUser(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = enrollSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_enroll", {
    p_user_id: parsed.data.userId,
    p_course_id: parsed.data.courseId,
    p_expires_at: parsed.data.expiresAt,
  });
  if (error) return { error: rpcError(error) };
  refresh();
  return { success: "Inscripción guardada." };
}

export async function unenrollUser(enrollmentId: string): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(enrollmentId).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase.from("enrollments").delete().eq("id", enrollmentId);
  if (error) return { error: rpcError(error) };
  refresh();
  return { success: "Inscripción eliminada." };
}

export type BulkEnrollState = FormState & {
  results?: { email: string; result: "enrolled" | "updated" | "not_found" }[];
};

const MAX_FILE_BYTES = 1024 * 1024;

export async function bulkEnroll(_prev: BulkEnrollState, formData: FormData): Promise<BulkEnrollState> {
  await requireAdmin();
  const parsed = bulkEnrollSchema.safeParse({
    courseId: formData.get("courseId"),
    expiresAt: formData.get("expiresAt") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const file = formData.get("file");
  const pasted = String(formData.get("emails") ?? "");
  let text = pasted;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) return { fieldErrors: { file: ["El archivo no puede pesar más de 1 MB."] } };
    text += "\n" + (await file.text());
  }
  const emails = extractEmails(text);
  if (emails.length === 0) {
    return { fieldErrors: { file: ["No encontramos emails. Subí un CSV o pegá una lista."] } };
  }
  if (emails.length > 1000) {
    return { fieldErrors: { file: ["Máximo 1000 emails por vez."] } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_enroll_emails", {
    p_course_id: parsed.data.courseId,
    p_emails: emails,
    p_expires_at: parsed.data.expiresAt,
  });
  if (error) return { error: rpcError(error) };
  const enrolled = data.filter((row) => row.result !== "not_found").length;
  return {
    success: `Listo: ${enrolled} de ${data.length} emails quedaron inscritos.`,
    results: data,
  };
}
