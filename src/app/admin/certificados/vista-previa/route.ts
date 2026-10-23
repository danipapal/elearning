import { getCurrentUser, isAdminRole } from "@/lib/auth";
import { generateCertificatePdf } from "@/lib/certificate-pdf";
import { getCertificateSettings, pdfResponse, verifyUrl } from "@/lib/certificates";

// Certificado de ejemplo con la plantilla actual.
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role)) return new Response("No autorizado", { status: 403 });
  const bytes = await generateCertificatePdf(
    {
      fullName: user.fullName || "Nombre del alumno",
      courseTitle: "Nombre del curso",
      issuedAt: new Date().toISOString(),
      code: "0000-0000-0000",
      verifyUrl: verifyUrl("0000-0000-0000"),
    },
    await getCertificateSettings(),
  );
  return pdfResponse(bytes, "vista-previa-certificado.pdf");
}
