import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { FILES_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

// Descarga de material: verifica el acceso (RLS sobre el adjunto y sobre
// Storage) y redirige a un enlace firmado que vence en 60 segundos.
export async function GET(_request: NextRequest, { params }: RouteContext<"/api/descargas/[id]">) {
  const { id } = await params;
  if (!z.guid().safeParse(id).success) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const supabase = await createClient();
  const { data: attachment } = await supabase
    .from("lesson_attachments")
    .select("file_path, file_name")
    .eq("id", id)
    .maybeSingle();
  if (!attachment) return new NextResponse("No encontrado", { status: 404 });

  const { data } = await supabase.storage
    .from(FILES_BUCKET)
    .createSignedUrl(attachment.file_path, 60, { download: attachment.file_name });
  if (!data?.signedUrl) return new NextResponse("No disponible", { status: 404 });

  return NextResponse.redirect(data.signedUrl, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
