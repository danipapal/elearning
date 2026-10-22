import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { getCurrentUser, isAdminRole } from "@/lib/auth";
import { SITE_NAME } from "@/lib/env";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <GraduationCap className="text-primary size-6" />
          <span className="hidden sm:inline">{SITE_NAME}</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/cursos">Cursos</Link>
          </Button>
          {user ? (
            <UserMenu fullName={user.fullName} email={user.email} isAdmin={isAdminRole(user.role)} />
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/registro">Registrarme</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
