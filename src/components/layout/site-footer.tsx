import Link from "next/link";

import { getSiteSettings, socialLinks } from "@/lib/site";

export async function SiteFooter() {
  const settings = await getSiteSettings();
  const social = socialLinks(settings);
  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto grid max-w-6xl gap-4 px-4 py-8 text-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.site_name}
          </p>
          <nav className="flex flex-wrap gap-4" aria-label="Información">
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
        {social.length > 0 && (
          <nav className="flex flex-wrap gap-4" aria-label="Redes sociales">
            {social.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                {link.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </footer>
  );
}
