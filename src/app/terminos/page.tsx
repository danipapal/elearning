import type { Metadata } from "next";

import { LegalPage } from "@/components/legal-page";
import { defaultTermsHtml } from "@/lib/legal";
import { getSiteSettings } from "@/lib/site";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  alternates: { canonical: "/terminos" },
};

export default async function TermsPage() {
  const settings = await getSiteSettings();
  return <LegalPage title="Términos y condiciones" html={settings.terms_html ?? defaultTermsHtml(settings)} />;
}
