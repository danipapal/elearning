import type { MetadataRoute } from "next";

import { publicEnv } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/stateless";

// Siempre actualizado: incluye los cursos publicados en este momento.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = publicEnv.NEXT_PUBLIC_SITE_URL;
  const { data: courses } = await createPublicClient()
    .from("courses")
    .select("slug, updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return [
    { url: site, changeFrequency: "weekly", priority: 1 },
    { url: `${site}/cursos`, changeFrequency: "weekly", priority: 0.9 },
    ...(courses ?? []).map((course) => ({
      url: `${site}/cursos/${course.slug}`,
      lastModified: new Date(course.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${site}/verificar`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${site}/contacto`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${site}/terminos`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${site}/privacidad`, changeFrequency: "yearly", priority: 0.1 },
  ];
}
