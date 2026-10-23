import type { Metadata } from "next";

import { LegalPage } from "@/components/legal-page";
import { defaultPrivacyHtml } from "@/lib/legal";
import { getSiteSettings } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de privacidad",
  alternates: { canonical: "/privacidad" },
};

export default async function PrivacyPage() {
  const settings = await getSiteSettings();
  return <LegalPage title="Política de privacidad" html={settings.privacy_html ?? defaultPrivacyHtml(settings)} />;
}
