"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { MINUTE, TOO_MANY_ATTEMPTS, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createStatelessClient } from "@/lib/supabase/stateless";
import { changePasswordSchema, deleteAccountSchema, profileSchema } from "@/lib/validation/auth";
import { fieldErrors, type FormState } from "@/lib/validation/form";

// Comprueba la contraseña actual sin tocar la sesión del navegador: inicia
// sesión con un cliente aparte y la cierra enseguida.
async function passwordMatches(email: string, password: string) {
  const client = createStatelessClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) return false;
  await client.auth.signOut({ scope: "local" });
  return true;
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/perfil");
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data.fullName }).eq("id", user.id);
  if (error) {
    console.error("[perfil]", error.code, error.message);
    return { error: "No se pudo guardar. Volvé a intentar." };
  }
  refresh();
  return { success: "Datos guardados." };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/perfil");
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (!rateLimit(`password:${user.id}`, 5, 15 * MINUTE)) return { error: TOO_MANY_ATTEMPTS };
  if (!(await passwordMatches(user.email, parsed.data.currentPassword))) {
    return { fieldErrors: { currentPassword: ["La contraseña actual no es correcta."] } };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    console.error("[perfil] contraseña", error.code, error.message);
    if (error.code === "same_password") {
      return { fieldErrors: { password: ["La nueva contraseña tiene que ser distinta de la actual."] } };
    }
    if (error.code === "weak_password") return { fieldErrors: { password: ["La contraseña es demasiado débil."] } };
    return { error: "No se pudo cambiar la contraseña. Volvé a intentar." };
  }
  return { success: "¡Listo! Cambiaste tu contraseña." };
}

export async function setAnnouncementEmails(enabled: boolean) {
  const user = await requireUser("/perfil");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ email_announcements: enabled === true })
    .eq("id", user.id);
  if (error) return { error: "No se pudo guardar tu preferencia." };
  refresh();
  return {};
}

export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/perfil");
  const parsed = deleteAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (!rateLimit(`delete-account:${user.id}`, 5, 15 * MINUTE)) return { error: TOO_MANY_ATTEMPTS };
  if (!(await passwordMatches(user.email, parsed.data.currentPassword))) {
    return { fieldErrors: { currentPassword: ["La contraseña no es correcta."] } };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    if (error.code === "42501") return { error: error.message };
    console.error("[perfil] eliminar cuenta", error.code, error.message);
    return { error: "No se pudo eliminar la cuenta. Volvé a intentar." };
  }
  // La sesión ya no es válida: solo se borran las cookies.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/?cuenta=eliminada");
}
