import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

import { DEFAULT_SITE_SETTINGS } from "@/lib/site";
import { createPublicClient } from "@/lib/supabase/stateless";

// Imagen que se ve al compartir el sitio en redes y mensajería.
export const alt = "Cursos online";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

const fonts = Promise.all([
  readFile(path.join(process.cwd(), "assets", "fonts", "Geist-Regular.ttf")),
  readFile(path.join(process.cwd(), "assets", "fonts", "Geist-SemiBold.ttf")),
]);

export default async function OpenGraphImage() {
  const [{ data }, [regular, bold]] = await Promise.all([
    createPublicClient().from("site_settings").select("site_name, description, primary_color").maybeSingle(),
    fonts,
  ]);
  const settings = { ...DEFAULT_SITE_SETTINGS, ...data };
  const color = /^#[0-9a-f]{6}$/.test(settings.primary_color) ? settings.primary_color : "#1d4ed8";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#ffffff",
          borderTop: `24px solid ${color}`,
          fontFamily: "Geist",
        }}
      >
        <div style={{ fontSize: 76, fontWeight: 600, color: "#18181b", lineHeight: 1.1 }}>{settings.site_name}</div>
        <div style={{ marginTop: 28, fontSize: 38, color: "#52525b", lineHeight: 1.35, maxWidth: 1000 }}>
          {settings.description}
        </div>
        <div style={{ marginTop: 56, display: "flex", alignItems: "center", fontSize: 30, color }}>
          Aprendé a tu ritmo · Certificados verificables
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: bold, weight: 600, style: "normal" },
      ],
    },
  );
}
