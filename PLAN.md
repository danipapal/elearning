# Plan: plataforma profesional de cursos online

Documento de especificación para construir con Claude Code una plataforma de cursos propia, sin WordPress, alojada en Render con Supabase como base de datos, autenticación y almacenamiento de archivos.

## 1. Objetivo

Una aplicación web profesional donde el administrador crea y gestiona cursos (videos enlazados desde Vimeo o YouTube y PDF subidos), administra usuarios y suscripciones, y los alumnos se registran, estudian y siguen su progreso. En la primera etapa el acceso es gratuito con registro; la arquitectura queda preparada para cobrar cursos o membresías más adelante sin rehacer nada.

## 2. Stack tecnológico

- **Frontend y backend:** Next.js (App Router) con TypeScript.
- **Estilos:** Tailwind CSS y una librería de componentes accesibles (shadcn/ui).
- **Base de datos:** Supabase (PostgreSQL) con Row Level Security (RLS) activado en todas las tablas.
- **Autenticación:** Supabase Auth (email y contraseña, recuperación de contraseña, verificación de email; opcional: Google).
- **Archivos (PDF, imágenes de portada, avatares):** Supabase Storage. Importante: no guardar archivos en el disco de Render, porque se borra en cada despliegue.
- **Videos:** enlaces de Vimeo (recomendado, permite restringir el dominio) o YouTube (no listado).
- **Emails transaccionales:** Resend o el SMTP de Supabase.
- **Hosting:** Render, plan Starter (Web Service, Node).
- **Pagos (fase futura):** Stripe y/o Mercado Pago.
- **Validación:** Zod en todos los formularios y endpoints.

## 3. Roles y permisos

- **Superadministrador:** control total, incluida la gestión de otros administradores y la configuración del sitio.
- **Administrador:** crea y edita cursos, gestiona alumnos, inscripciones y suscripciones.
- **Instructor (opcional, fase 2):** crea y edita solo sus propios cursos y ve el progreso de sus alumnos.
- **Alumno:** se registra, se inscribe, estudia, descarga material, responde cuestionarios y obtiene certificados.
- **Visitante:** ve el catálogo, la página de cada curso y las lecciones marcadas como vista previa gratuita.

Los permisos se aplican en dos niveles: en el servidor (middleware y comprobaciones por rol) y en la base de datos (políticas RLS). Nunca confiar solo en ocultar botones en la interfaz.

## 4. Funciones del sitio público

- Página de inicio con cursos destacados.
- Catálogo con búsqueda, filtro por categoría, nivel y gratuito/pago.
- Página de cada curso: portada, video de presentación, descripción, lo que se aprende, requisitos, temario por módulos, instructor, duración total, preguntas frecuentes y botón de inscripción.
- Lecciones de vista previa accesibles sin registrarse.
- Páginas legales: términos y condiciones, política de privacidad, contacto.
- Diseño responsive, pensado primero para celular.
- SEO: metadatos por página, URLs amigables (slugs), sitemap y Open Graph para compartir en redes.

## 5. Área del alumno

- Registro gratuito, inicio de sesión, verificación de email y recuperación de contraseña.
- Panel "Mi aprendizaje": cursos inscritos con barra de progreso y botón "Continuar donde lo dejé".
- Reproductor de lección: video incrustado, resumen en texto enriquecido, PDF descargables, navegación anterior/siguiente y botón "Marcar como completada".
- Índice lateral del curso con el estado de cada lección.
- Cuestionarios por módulo con calificación automática y nota mínima configurable.
- Certificado en PDF generado automáticamente al completar el 100% (con código de verificación único).
- Perfil: nombre, foto, cambio de contraseña, preferencias de notificación, descarga de sus datos y eliminación de cuenta.
- Notas personales por lección (opcional).
- Preguntas o comentarios por lección, moderados por el administrador (opcional, fase 2).

## 6. Panel de administración: cursos

- Listado de cursos con estado (borrador, publicado, archivado), número de inscritos y fecha de actualización.
- Crear y editar curso: título, slug, descripción corta y larga, portada, video de presentación, categoría, nivel, idioma, instructor, requisitos, objetivos de aprendizaje, preguntas frecuentes.
- Tipo de acceso por curso: gratuito con registro, de pago único, incluido en membresía, o solo por invitación. En la fase 1 se usa solo "gratuito con registro", pero el campo existe desde el principio.
- Constructor de temario: módulos y lecciones con orden por arrastrar y soltar.
- Tipos de lección:
  - Video (URL de Vimeo o YouTube, validada y convertida automáticamente a reproductor incrustado; duración).
  - Texto (editor enriquecido).
  - PDF (subida a Supabase Storage, con límite de tamaño y verificación de tipo).
  - Cuestionario (preguntas de opción múltiple, verdadero/falso; nota mínima; intentos permitidos).
  - Mixta: video más texto más adjuntos.
- Marcar lecciones como vista previa gratuita.
- Liberación programada de contenido (drip): módulos que se habilitan X días después de la inscripción (opcional).
- Duplicar curso, vista previa como alumno, publicar y despublicar.
- Categorías y etiquetas gestionables.
- Plantilla de certificado editable (logo, firma, texto).

## 7. Panel de administración: usuarios y suscripciones

- Listado de usuarios con búsqueda y filtros (rol, estado, fecha de registro, curso).
- Ficha de usuario: datos, cursos inscritos, progreso por curso, resultados de cuestionarios, certificados, historial de actividad.
- Acciones: cambiar rol, suspender o reactivar cuenta, reenviar verificación, forzar restablecimiento de contraseña, eliminar cuenta.
- Inscripciones manuales: inscribir o dar de baja a un usuario en un curso, con fecha de vencimiento opcional.
- Inscripción masiva desde un archivo CSV.
- Exportar usuarios y progreso a CSV.
- **Planes y suscripciones** (estructura lista desde la fase 1, cobro activado en la fase 3):
  - Crear planes (por ejemplo: Gratis, Mensual, Anual) con precio, moneda, duración y cursos incluidos.
  - Ver suscripciones activas, vencidas y canceladas.
  - Asignar o revocar suscripciones manualmente.
  - Cupones de descuento con vencimiento y límite de usos.
- Envío de anuncios por email a todos los alumnos o a los de un curso.

## 8. Panel de administración: estadísticas y configuración

- Dashboard: usuarios registrados, nuevos por semana, inscripciones, cursos completados, lecciones más vistas, tasa de abandono por lección y resultados promedio de cuestionarios.
- Registro de auditoría: quién hizo qué cambio en el panel y cuándo.
- Configuración del sitio: nombre, logo, colores, email de contacto, textos legales, redes sociales.
- Plantillas de email editables: bienvenida, verificación, recuperación de contraseña, certificado obtenido, anuncio.

## 9. Modelo de datos (tablas principales)

- **profiles:** id (vinculado a auth.users), nombre, avatar, rol, estado, fecha de creación.
- **categories:** id, nombre, slug.
- **courses:** id, título, slug, descripciones, portada, video de presentación, categoría, nivel, instructor, tipo de acceso, precio, estado, fechas.
- **modules:** id, curso, título, orden, días para liberar.
- **lessons:** id, módulo, título, tipo, URL de video, proveedor, duración, contenido, es vista previa, orden.
- **lesson_attachments:** id, lección, ruta del archivo en Storage, nombre, tamaño.
- **quizzes, quiz_questions, quiz_options, quiz_attempts:** cuestionarios, preguntas, opciones y respuestas de alumnos.
- **enrollments:** id, usuario, curso, origen (gratuito, manual, compra, suscripción), fecha, vencimiento, estado.
- **lesson_progress:** usuario, lección, completada, fecha.
- **certificates:** id, usuario, curso, código de verificación, fecha, ruta del PDF.
- **plans, subscriptions, coupons, payments:** estructura para la monetización futura.
- **audit_logs:** usuario, acción, entidad, fecha, detalles.
- **site_settings:** configuración general.

## 10. Seguridad

- Row Level Security en todas las tablas: el alumno solo lee y modifica sus propios datos; el contenido de pago solo es visible para inscritos; solo administradores escriben en cursos.
- La clave service_role de Supabase solo en el servidor, nunca en el navegador.
- Variables de entorno en Render; nada de claves en el código ni en el repositorio.
- Storage con buckets privados para PDF de cursos y enlaces firmados con vencimiento corto para descargas.
- Validación de entradas con Zod y sanitización del texto enriquecido para evitar XSS.
- Protección contra fuerza bruta: límite de intentos de login y de registro (rate limiting) y CAPTCHA (Cloudflare Turnstile) en registro.
- Contraseñas gestionadas por Supabase Auth; verificación de email obligatoria.
- Cabeceras de seguridad (CSP, HSTS, X-Frame-Options) y HTTPS obligatorio.
- Videos de Vimeo con privacidad "solo en dominios específicos" para que no se vean fuera de la plataforma.
- Registro de auditoría de acciones administrativas.
- Cumplimiento básico de privacidad: consentimiento en el registro, exportación y eliminación de datos personales.
- Copias de seguridad: activar backups de Supabase al pasar al plan Pro; mientras tanto, exportación periódica.

## 11. Monetización (fase futura)

- Integración con Stripe (internacional) y/o Mercado Pago (Latinoamérica).
- Compra única por curso y membresías recurrentes mensuales o anuales.
- Webhooks para activar o cancelar el acceso automáticamente según el estado del pago.
- Portal del cliente para cambiar o cancelar la suscripción.
- Facturas o recibos por email.
- Período de prueba gratuito configurable.

## 12. Fases de desarrollo

1. **Base:** proyecto Next.js, conexión a Supabase, autenticación, roles, diseño general y despliegue inicial en Render.
2. **Cursos:** panel de administración de cursos, módulos, lecciones, videos enlazados y subida de PDF.
3. **Alumno:** catálogo, inscripción gratuita, reproductor, progreso y panel "Mi aprendizaje".
4. **Administración de usuarios:** listado, fichas, inscripciones manuales, exportaciones y dashboard.
5. **Evaluación y certificados:** cuestionarios y certificados en PDF.
6. **Pulido y seguridad:** revisión de RLS, rate limiting, emails, SEO, pruebas y textos legales.
7. **Monetización:** planes, pagos, webhooks y cupones.

Cada fase termina con la app funcionando y desplegada, para probarla antes de seguir.

## 13. Costos estimados al inicio

- Render Starter: unos 7 USD al mes.
- Supabase: plan gratuito al inicio (500 MB de base de datos y 1 GB de archivos; el proyecto se pausa tras una semana sin actividad). Plan Pro, unos 25 USD al mes, cuando haya alumnos constantes o se empiece a cobrar.
- Dominio propio: unos 10 a 15 USD al año.
- Vimeo: plan gratuito limitado; para restringir dominios hace falta un plan pago.
- Resend: plan gratuito suficiente al inicio.

Precios aproximados; confirmarlos en cada servicio antes de contratar.

## 14. Instrucción para Claude Code

Copiar este texto como primer mensaje en Claude Code, con este documento guardado en la carpeta del proyecto como PLAN.md:

"Leé el archivo PLAN.md. Es la especificación completa de una plataforma de cursos con Next.js, Supabase y Render. Construila por fases, empezando por la fase 1. Antes de cada fase, explicame qué vas a hacer; al terminarla, decime cómo probarla y esperá mi confirmación para seguir. Guiame paso a paso para crear las cuentas de Supabase y Render y configurar las variables de entorno. Priorizá la seguridad: RLS en todas las tablas y ninguna clave secreta en el navegador."
