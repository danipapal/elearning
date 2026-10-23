import "server-only";

import { escapeHtml } from "@/lib/html";
import type { SiteSettings } from "@/types/database";

// Textos modelo para Argentina. Se usan mientras el administrador no cargue
// los propios en Administración > Configuración. Conviene que los revise un
// abogado antes de cobrar por los cursos.

function contactLine(settings: SiteSettings) {
  return settings.contact_email
    ? `escribinos a <a href="mailto:${escapeHtml(settings.contact_email)}">${escapeHtml(settings.contact_email)}</a>`
    : `escribinos desde la página de <a href="/contacto">contacto</a>`;
}

export function defaultTermsHtml(settings: SiteSettings) {
  const site = escapeHtml(settings.site_name);
  return `
<p>Estos términos regulan el uso de ${site} (en adelante, “la plataforma”). Al crear una cuenta o usar la plataforma, aceptás estos términos. Si no estás de acuerdo, no la uses.</p>
<h2>1. La cuenta</h2>
<ul>
<li>Para inscribirte en los cursos necesitás una cuenta con un email válido y confirmado.</li>
<li>Sos responsable de mantener tu contraseña en secreto y de toda la actividad de tu cuenta. La cuenta es personal: no la compartas.</li>
<li>Los datos que cargues tienen que ser verdaderos. El nombre que indiques es el que figura en los certificados.</li>
</ul>
<h2>2. Uso de los cursos</h2>
<ul>
<li>El acceso a un curso es personal e intransferible y es para uso propio, no comercial.</li>
<li>Los videos, textos, materiales descargables y cuestionarios son propiedad de ${site} o de sus autores y están protegidos por la ley de propiedad intelectual (Ley 11.723). No está permitido copiarlos, descargarlos por medios no previstos, revenderlos ni publicarlos.</li>
<li>Algunos cursos pueden tener una duración de acceso limitada o liberar sus módulos de forma gradual; esas condiciones se informan en la página de cada curso.</li>
</ul>
<h2>3. Certificados</h2>
<p>Al completar todas las lecciones de un curso se emite un certificado de finalización con un código de verificación público. El certificado acredita que completaste el curso en la plataforma; no es un título oficial.</p>
<h2>4. Conducta</h2>
<p>No está permitido usar la plataforma para actividades ilegales, intentar acceder a cuentas o contenidos ajenos, afectar su funcionamiento o automatizar el acceso. Podemos suspender o eliminar las cuentas que no cumplan estos términos.</p>
<h2>5. Disponibilidad y cambios</h2>
<p>Hacemos lo posible para que la plataforma funcione sin interrupciones, pero puede haber cortes por mantenimiento o causas ajenas. Podemos actualizar los cursos y estos términos; si el cambio es importante, te avisaremos por email o en la plataforma.</p>
<h2>6. Responsabilidad</h2>
<p>El contenido de los cursos es educativo e informativo. Las decisiones que tomes a partir de lo aprendido son tu responsabilidad.</p>
<h2>7. Ley aplicable</h2>
<p>Estos términos se rigen por las leyes de la República Argentina, incluida la Ley 24.240 de Defensa del Consumidor.</p>
<h2>8. Contacto</h2>
<p>Si tenés dudas sobre estos términos, ${contactLine(settings)}.</p>`.trim();
}

export function defaultPrivacyHtml(settings: SiteSettings) {
  const site = escapeHtml(settings.site_name);
  return `
<p>En ${site} cuidamos tus datos personales. Esta política explica qué datos recolectamos, para qué los usamos y qué derechos tenés, de acuerdo con la Ley 25.326 de Protección de los Datos Personales.</p>
<h2>1. Qué datos recolectamos</h2>
<ul>
<li><strong>Datos de la cuenta:</strong> nombre, email y contraseña (guardada cifrada; nadie puede verla).</li>
<li><strong>Datos de uso:</strong> cursos en los que te inscribiste, lecciones completadas, resultados de cuestionarios y certificados emitidos.</li>
<li><strong>Datos técnicos:</strong> dirección IP y datos del navegador, usados para la seguridad (por ejemplo, para frenar intentos de acceso abusivos).</li>
</ul>
<h2>2. Para qué los usamos</h2>
<ul>
<li>Darte acceso a los cursos y guardar tu progreso.</li>
<li>Emitir y permitir la verificación de tus certificados.</li>
<li>Enviarte emails necesarios (confirmación de cuenta, recuperación de contraseña, certificados) y, si no te diste de baja, anuncios sobre los cursos.</li>
<li>Mejorar los cursos a partir de estadísticas generales.</li>
</ul>
<p>No vendemos ni alquilamos tus datos.</p>
<h2>3. Con quién los compartimos</h2>
<p>Solo con los proveedores que necesitamos para funcionar: alojamiento de la base de datos y de la web, envío de emails y protección contra bots. Tratan los datos por cuenta nuestra y con medidas de seguridad adecuadas. Algunos de estos proveedores pueden almacenar datos fuera de la Argentina.</p>
<h2>4. Certificados públicos</h2>
<p>Cualquier persona que tenga el código de un certificado puede verificar que es válido. La verificación muestra tu nombre, el curso y la fecha de emisión.</p>
<h2>5. Tus derechos</h2>
<p>Podés acceder, rectificar y eliminar tus datos en cualquier momento. Desde <a href="/perfil">Mi perfil</a> podés cambiar tu nombre, darte de baja de los anuncios, descargar una copia de tus datos y eliminar tu cuenta. También podés ${contactLine(settings)}.</p>
<p>La Agencia de Acceso a la Información Pública, en su carácter de órgano de control de la Ley 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre protección de datos personales.</p>
<h2>6. Cookies</h2>
<p>Usamos solo las cookies necesarias para mantener tu sesión iniciada. No usamos cookies de publicidad.</p>
<h2>7. Seguridad y conservación</h2>
<p>Aplicamos medidas técnicas para proteger tus datos (conexión cifrada, control de accesos, contraseñas cifradas). Conservamos tus datos mientras tengas una cuenta; si la eliminás, se borran tu perfil, tu progreso y tus certificados.</p>
<h2>8. Cambios</h2>
<p>Si cambiamos esta política, publicaremos la nueva versión en esta página y, si el cambio es importante, te avisaremos por email.</p>`.trim();
}
