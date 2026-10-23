import { getCurrentUser } from "@/lib/auth";
import { generateCertificatePdf } from "@/lib/certificate-pdf";
import { getCertificateSettings, normalizeCode, pdfResponse, verifyUrl } from "@/lib/certificates";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

// PDF del certificado. Solo lo descarga su dueño o un admin (RLS).
export async function GET(_request: Request, { params }: RouteContext<"/certificados/[code]/pdf">) {
  const code = normalizeCode((await params).code);
  if (!code) return new Response("No encontrado", { status: 404 });
  const user = await getCurrentUser();
  if (!user) return new Response("Iniciá sesión para descargar el certificado.", { status: 401 });

  const supabase = await createClient();
  const { data: certificate } = await supabase
    .from("certificates")
    .select("code, full_name, course_title, issued_at")
    .eq("code", code)
    .maybeSingle();
  if (!certificate) return new Response("No encontrado", { status: 404 });

  const bytes = await generateCertificatePdf(
    {
      fullName: certificate.full_name,
      courseTitle: certificate.course_title,
      issuedAt: certificate.issued_at,
      code: certificate.code,
      verifyUrl: verifyUrl(certificate.code),
    },
    await getCertificateSettings(),
  );
  return pdfResponse(bytes, `certificado-${slugify(certificate.course_title)}.pdf`);
}
