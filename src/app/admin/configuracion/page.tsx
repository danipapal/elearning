import type { Metadata } from "next";

import { BrandingUpload } from "@/components/admin/branding-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { defaultPrivacyHtml, defaultTermsHtml } from "@/lib/legal";
import { getSiteSettings } from "@/lib/site";
import { coverUrl } from "@/lib/storage";

import { setSiteLogo } from "./actions";
import { LegalForm } from "./legal-form";
import { SiteSettingsForm } from "./site-settings-form";

export const metadata: Metadata = { title: "Configuración" };

export default async function SiteSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div className="grid grid-cols-1 gap-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración del sitio</h1>
        <p className="text-muted-foreground mt-1">Nombre, marca, contacto y textos legales.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>Se muestra en el encabezado del sitio y en los emails.</CardDescription>
        </CardHeader>
        <CardContent>
          <BrandingUpload
            kind="site-logo"
            label="Logo del sitio"
            hint="PNG con fondo transparente, horizontal. Si no subís uno, se muestra el nombre del sitio."
            imageUrl={coverUrl(settings.logo_path)}
            save={setSiteLogo}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <SiteSettingsForm settings={settings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Términos y condiciones</CardTitle>
          <CardDescription>
            Se publica en <a href="/terminos" target="_blank" rel="noopener" className="text-primary hover:underline">/terminos</a>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LegalForm
            kind="terms"
            html={settings.terms_html ?? defaultTermsHtml(settings)}
            isDefault={settings.terms_html === null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Política de privacidad</CardTitle>
          <CardDescription>
            Se publica en <a href="/privacidad" target="_blank" rel="noopener" className="text-primary hover:underline">/privacidad</a>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LegalForm
            kind="privacy"
            html={settings.privacy_html ?? defaultPrivacyHtml(settings)}
            isDefault={settings.privacy_html === null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
