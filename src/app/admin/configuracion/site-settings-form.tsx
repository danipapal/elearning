"use client";

import { useState } from "react";

import { updateSiteSettings } from "@/app/admin/configuracion/actions";
import { FormField, FormStatus, SaveButton, useFormAction } from "@/components/admin/form-fields";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SiteSettings } from "@/types/database";

const SOCIAL = [
  { name: "instagram_url", label: "Instagram", placeholder: "https://instagram.com/tu-cuenta" },
  { name: "facebook_url", label: "Facebook", placeholder: "https://facebook.com/tu-pagina" },
  { name: "youtube_url", label: "YouTube", placeholder: "https://youtube.com/@tu-canal" },
  { name: "tiktok_url", label: "TikTok", placeholder: "https://tiktok.com/@tu-cuenta" },
  { name: "x_url", label: "X (Twitter)", placeholder: "https://x.com/tu-cuenta" },
  { name: "linkedin_url", label: "LinkedIn", placeholder: "https://linkedin.com/company/tu-empresa" },
] as const;

export function SiteSettingsForm({ settings }: { settings: SiteSettings }) {
  const { state, onSubmit, pending } = useFormAction(updateSiteSettings);
  const [color, setColor] = useState(settings.primary_color);

  return (
    <form onSubmit={onSubmit} className="grid gap-8" noValidate>
      <section className="grid gap-4">
        <h2 className="text-lg font-semibold">General</h2>
        <FormField name="site_name" label="Nombre del sitio" state={state}>
          <Input id="site_name" name="site_name" defaultValue={settings.site_name} maxLength={60} required />
        </FormField>
        <FormField
          name="description"
          label="Descripción"
          hint="Aparece en Google y al compartir el sitio en redes. Máximo 200 caracteres."
          state={state}
        >
          <Textarea id="description" name="description" defaultValue={settings.description} rows={2} maxLength={200} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField name="primary_color" label="Color principal" hint="Botones, enlaces y detalles." state={state}>
            <div className="flex items-center gap-3">
              <input
                type="color"
                aria-label="Elegir color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-9 w-14 cursor-pointer rounded-md border p-1"
              />
              <Input
                id="primary_color"
                name="primary_color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                maxLength={7}
                className="font-mono"
              />
            </div>
          </FormField>
          <FormField
            name="contact_email"
            label="Email de contacto"
            hint="Recibe los mensajes del formulario de contacto."
            state={state}
          >
            <Input id="contact_email" name="contact_email" type="email" defaultValue={settings.contact_email} />
          </FormField>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-lg font-semibold">Redes sociales</h2>
        <p className="text-muted-foreground -mt-2 text-sm">Se muestran en el pie de página y en Contacto. Dejá vacías las que no uses.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIAL.map((network) => (
            <FormField key={network.name} name={network.name} label={network.label} state={state}>
              <Input
                id={network.name}
                name={network.name}
                type="url"
                defaultValue={settings[network.name]}
                placeholder={network.placeholder}
                maxLength={300}
              />
            </FormField>
          ))}
          <FormField
            name="whatsapp"
            label="WhatsApp"
            hint="Número con código de país, sin espacios. Ej: 5491112345678"
            state={state}
          >
            <Input id="whatsapp" name="whatsapp" inputMode="tel" defaultValue={settings.whatsapp} maxLength={20} />
          </FormField>
        </div>
      </section>

      <div className="grid gap-3">
        <FormStatus state={state} />
        <div>
          <SaveButton pending={pending}>Guardar configuración</SaveButton>
        </div>
      </div>
    </form>
  );
}
