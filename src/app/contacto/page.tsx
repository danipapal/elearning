import type { Metadata } from "next";
import { Mail, MessageCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { emailEnabled } from "@/lib/email";
import { getSiteSettings, socialLinks } from "@/lib/site";

import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Escribinos por cualquier consulta sobre los cursos.",
  alternates: { canonical: "/contacto" },
};

export default async function ContactPage() {
  const settings = await getSiteSettings();
  const social = socialLinks(settings).filter((link) => link.label !== "WhatsApp");
  const showForm = emailEnabled() && Boolean(settings.contact_email);

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-12">
      <div>
        <h1 className="text-3xl font-bold">Contacto</h1>
        <p className="text-muted-foreground mt-2">¿Tenés una consulta? Escribinos y te respondemos a la brevedad.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
        {showForm ? (
          <Card>
            <CardHeader>
              <CardTitle>Envianos un mensaje</CardTitle>
            </CardHeader>
            <CardContent>
              <ContactForm />
            </CardContent>
          </Card>
        ) : (
          !settings.contact_email &&
          !settings.whatsapp && (
            <p className="text-muted-foreground">Muy pronto vas a poder escribirnos desde esta página.</p>
          )
        )}
        {(settings.contact_email || settings.whatsapp || social.length > 0) && (
          <aside className="grid content-start gap-4 text-sm">
            {settings.contact_email && (
              <a href={`mailto:${settings.contact_email}`} className="hover:text-primary flex items-center gap-2 break-all">
                <Mail className="size-4 shrink-0" /> {settings.contact_email}
              </a>
            )}
            {settings.whatsapp && (
              <a
                href={`https://wa.me/${settings.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary flex items-center gap-2"
              >
                <MessageCircle className="size-4 shrink-0" /> WhatsApp
              </a>
            )}
            {social.length > 0 && (
              <div className="grid gap-2">
                <p className="font-medium">Seguinos</p>
                {social.map((link) => (
                  <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
