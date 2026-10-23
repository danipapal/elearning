import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
};

// Capa de acceso a datos: único lugar donde se lee la sesión.
// getUser() valida el token contra Supabase (no confía en la cookie).
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "active") return null;

  return {
    id: user.id,
    email: user.email ?? "",
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    role: profile.role,
  };
});

export function isAdminRole(role: UserRole) {
  return role === "admin" || role === "superadmin";
}

// Para páginas que requieren sesión.
export async function requireUser(nextPath?: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }
  return user;
}

// Para páginas y acciones de administración.
export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (!isAdminRole(user.role)) {
    redirect("/mi-aprendizaje");
  }
  return user;
}

export { safeNextPath } from "@/lib/safe-path";
