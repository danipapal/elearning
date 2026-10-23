import Image from "next/image";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { getCurrentUser, isAdminRole } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site";
import { coverUrl } from "@/lib/storage";

export async function SiteHeader() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSiteSettings()]);
  const logo = coverUrl(settings.logo_path);

  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold" aria-label={`${settings.site_name}: inicio`}>
          {logo ? (
            <Image src={logo} alt="" width={160} height={40} className="h-9 w-auto max-w-40 object-contain" priority />
          ) : (
            <GraduationCap className="text-primary size-6 shrink-0" />
          )}
          <span className={logo ? "sr-only" : "hidden truncate sm:inline"}>{settings.site_name}</span>
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
