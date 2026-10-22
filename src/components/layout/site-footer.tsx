import Link from "next/link";

import { SITE_NAME } from "@/lib/env";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {SITE_NAME}
        </p>
        <nav className="flex flex-wrap gap-4">
          <Link href="/terminos" className="hover:text-foreground">
            Términos y condiciones
          </Link>
          <Link href="/privacidad" className="hover:text-foreground">
            Privacidad
          </Link>
          <Link href="/contacto" className="hover:text-foreground">
            Contacto
          </Link>
        </nav>
      </div>
    </footer>
  );
}
