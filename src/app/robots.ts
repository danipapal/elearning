import type { MetadataRoute } from "next";

import { publicEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const site = publicEnv.NEXT_PUBLIC_SITE_URL;
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/mi-aprendizaje", "/perfil", "/certificados", "/auth", "/api", "/nueva-contrasena"],
    },
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
