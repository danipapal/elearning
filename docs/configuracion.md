# Guía de configuración: Supabase y Render

Esta guía se hace **una sola vez**. Tiempo estimado: 20 a 30 minutos.
No hace falta saber programar: son pasos en las páginas de Supabase y Render.

> Regla de oro: las claves **nunca** se escriben en el código ni se suben a GitHub.
> Solo se cargan en el panel de Render (y, si probás en tu computadora, en `.env.local`).

---

## Parte 1: Supabase (base de datos, usuarios y archivos)

### 1.1 Crear la cuenta y el proyecto

1. Entrá a <https://supabase.com> y tocá **Start your project**. Podés registrarte con tu cuenta de GitHub.
2. Tocá **New project**.
   - **Name:** `elearning`
   - **Database Password:** tocá *Generate a password* y **guardala** en un lugar seguro (gestor de contraseñas).
   - **Region:** la más cercana a tus alumnos (por ejemplo *South America (São Paulo)*).
   - **Plan:** Free.
3. Tocá **Create new project** y esperá 1 o 2 minutos a que termine.

### 1.2 Crear las tablas (migración)

1. En el menú izquierdo, abrí **SQL Editor** y tocá **New query**.
2. Abrí en GitHub el archivo [`supabase/migrations/0001_profiles_y_roles.sql`](../supabase/migrations/0001_profiles_y_roles.sql), tocá el botón de copiar (*Copy raw file*) y pegalo en el editor.
3. Tocá **Run**. Tiene que decir *Success. No rows returned*.
4. Comprobación: en **Table Editor** tiene que aparecer la tabla `profiles` sin el aviso rojo de *RLS disabled*.

### 1.3 Configurar la autenticación

1. **Authentication > Sign In / Providers > Email**: que esté activado y que **Confirm email** esté encendido. En *Minimum password length* poné `8`.
2. **Authentication > URL Configuration**:
   - **Site URL:** por ahora `http://localhost:3000` (en la parte 2 la cambiamos por la de Render).
   - **Redirect URLs:** agregá `http://localhost:3000/**` (en la parte 2 agregamos la de Render).
3. Las plantillas de los emails (en español) se cargan en la **parte 4**, después de configurar Resend.

> El servidor de email incluido en Supabase solo envía unos pocos emails por hora. Alcanza para probar;
> para producción se configura Resend (parte 4).

### 1.4 Copiar las claves públicas

En **Project Settings > API Keys** (o el botón **Connect** arriba):

| Dato en Supabase | Variable |
| --- | --- |
| Project URL (`https://xxxx.supabase.co`) | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable key (`sb_publishable_...`) o, si no aparece, la *anon public* key | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |

Estas dos son **públicas** por diseño: lo que se puede hacer con ellas lo limita RLS.
La **secret key / service_role** NO hace falta todavía; cuando la necesitemos irá solo en Render, nunca en el navegador.

---

## Parte 2: Render (donde vive la web)

### 2.1 Crear la cuenta y el servicio

1. Entrá a <https://render.com> y registrate con tu cuenta de **GitHub**.
2. Tocá **New > Blueprint**.
3. Conectá GitHub si te lo pide y elegí el repositorio **danipapal/elearning**.
   (Si no aparece: *Configure account* y dale acceso a ese repositorio.)
4. Render lee el archivo `render.yaml` y te pide tres valores:
   - `NEXT_PUBLIC_SUPABASE_URL`: el de Supabase (paso 1.4).
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: el de Supabase (paso 1.4).
   - `NEXT_PUBLIC_SITE_URL`: poné `https://elearning.onrender.com` por ahora (lo corregimos en 2.2 si Render asigna otra).
5. Tocá **Apply** / **Deploy Blueprint**. El primer despliegue tarda unos 3 a 5 minutos.

> El servicio está en el plan **Free** para probar: se "duerme" tras 15 minutos sin visitas y la primera carga tarda unos segundos.
> Cuando lancemos, lo pasamos a **Starter** (unos 7 USD/mes) desde *Settings > Instance Type*.

### 2.2 Ajustar la URL

1. En el servicio, arriba a la izquierda, vas a ver la URL real (por ejemplo `https://elearning-abcd.onrender.com`).
2. Si es distinta de la que pusiste: **Environment** > editá `NEXT_PUBLIC_SITE_URL` con la URL real (sin barra final) > **Save, rebuild and deploy**.
   (Las variables `NEXT_PUBLIC_` se graban al compilar, por eso hay que volver a desplegar.)
3. Volvé a Supabase > **Authentication > URL Configuration**:
   - **Site URL:** la URL de Render.
   - **Redirect URLs:** agregá `https://TU-URL.onrender.com/**`.

---

## Parte 3: hacerte superadministrador

1. Abrí la web en Render, tocá **Registrarme** y creá tu cuenta.
2. Abrí el email de confirmación y tocá el enlace.
3. En Supabase > **SQL Editor** ejecutá (con tu email):
   ```sql
   update public.profiles
   set role = 'superadmin'
   where id = (select id from auth.users where email = 'TU_EMAIL@ejemplo.com');
   ```
4. Recargá la web: en tu menú de usuario aparece **Administración**.

Por seguridad, el rol **no** se puede cambiar desde la web por un usuario común; solo desde el servidor o con SQL.

---

## (Opcional) Probar en tu computadora

Necesitás [Node.js 22 o superior](https://nodejs.org).

```bash
git clone https://github.com/danipapal/elearning.git
cd elearning
npm install
cp .env.example .env.local   # completá los valores de Supabase
npm run dev
```

Abrí <http://localhost:3000>.

---

## Parte 4: emails con tu dominio (Resend)

Con esto los emails salen desde una dirección de tu dominio (por ejemplo `hola@tudominio.com`), llegan mejor
(menos spam) y se activan la bienvenida, el aviso de certificado, los anuncios y el formulario de contacto.
El plan gratis de Resend permite 3.000 emails por mes (100 por día).

### 4.1 Crear la cuenta y verificar el dominio

1. Entrá a <https://resend.com> y creá una cuenta.
2. **Domains > Add Domain**: escribí tu dominio (ej. `tudominio.com`) y elegí la región **São Paulo (sa-east-1)**.
3. Resend te muestra 3 o 4 registros DNS (tipo **MX** y **TXT**). Hay que cargarlos donde administrás el
   dominio (Nic.ar, GoDaddy, Cloudflare, etc.). Copiá cada uno **tal cual** (nombre, tipo y valor).
4. Volvé a Resend y tocá **Verify DNS Records**. Puede tardar de unos minutos a unas horas. Cuando diga
   **Verified**, seguí.

### 4.2 Crear la clave

1. **API Keys > Create API Key**. Nombre: `elearning`. Permiso: **Sending access**. Dominio: el tuyo.
2. Copiá la clave (`re_...`). Solo se muestra una vez. **Es secreta**: va únicamente en Render.

### 4.3 Cargarla en Render

En Render > tu servicio > **Environment**, agregá:

| Variable | Valor |
| --- | --- |
| `RESEND_API_KEY` | la clave `re_...` |
| `EMAIL_FROM` | la dirección remitente, ej. `hola@tudominio.com` (tiene que ser de tu dominio verificado) |

Tocá **Save, rebuild and deploy**. En la web, **Administración > Emails** tiene que decir *Envío de emails activo*.
Probá con **Enviarme una prueba**.

### 4.4 Que Supabase también use Resend (confirmación y recuperación de contraseña)

1. Supabase > **Authentication > Emails > SMTP Settings** > activá **Enable custom SMTP**:
   - **Sender email:** el mismo `EMAIL_FROM` (ej. `hola@tudominio.com`)
   - **Sender name:** el nombre de tu sitio
   - **Host:** `smtp.resend.com` · **Port:** `465`
   - **Username:** `resend` · **Password:** la clave `re_...`
2. **Authentication > Rate Limits**:
   - *Rate limit for sending emails*: subilo a `100` por hora.
   - *Rate limit for sign ups and sign ins*: subilo a `300`. Todos los inicios de sesión pasan por el servidor
     de Render, así que Supabase los ve como si vinieran de una sola IP; la web ya tiene su propio límite por persona.
3. **Authentication > Emails > Templates**: reemplazá cada plantilla por estas (asunto y cuerpo).

**Confirm signup**: asunto `Confirmá tu cuenta`

```html
<h2>¡Te damos la bienvenida!</h2>
<p>Para activar tu cuenta, confirmá tu email tocando el botón:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/mi-aprendizaje"
  style="background:#1d4ed8;color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block">Confirmar mi cuenta</a></p>
<p>Si no creaste una cuenta, ignorá este email.</p>
```

**Reset Password**: asunto `Creá una nueva contraseña`

```html
<h2>Recuperar tu contraseña</h2>
<p>Recibimos un pedido para cambiar tu contraseña. Tocá el botón para crear una nueva:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery"
  style="background:#1d4ed8;color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block">Crear nueva contraseña</a></p>
<p>El enlace vence en una hora. Si no lo pediste, ignorá este email: tu contraseña no cambia.</p>
```

**Change Email Address**: asunto `Confirmá tu nuevo email`

```html
<h2>Confirmá tu nuevo email</h2>
<p>Tocá el botón para confirmar el cambio de <strong>{{ .Email }}</strong> a <strong>{{ .NewEmail }}</strong>:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&next=/perfil"
  style="background:#1d4ed8;color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block">Confirmar cambio</a></p>
```

Los emails propios de la web (bienvenida, certificado obtenido y anuncios) se editan en **Administración > Emails**.

---

## Parte 5: captcha contra bots (Cloudflare Turnstile)

Gratis. Protege el registro, la recuperación de contraseña y el formulario de contacto. La mayoría de las personas
no ve nada; solo a los visitantes sospechosos se les pide un clic.

1. Entrá a <https://dash.cloudflare.com>, creá una cuenta y abrí **Turnstile > Add widget**.
2. **Widget name:** `elearning`. **Hostnames:** agregá el dominio de la web (ej. `tudominio.com` y/o
   `elearning-u8lp.onrender.com`). **Widget mode:** *Managed*.
3. Copiá las dos claves y cargalas en Render > **Environment**:

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | *Site Key* (pública) |
| `TURNSTILE_SECRET_KEY` | *Secret Key* (secreta) |

4. **Save, rebuild and deploy**. En **Administración > Emails** tiene que decir *Captcha activo*.

---

## Variables de entorno (resumen)

| Variable | Obligatoria | Pública | Para qué |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | Sí | Conexión con Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí | Sí | Conexión con Supabase (limitada por RLS) |
| `NEXT_PUBLIC_SITE_URL` | Sí | Sí | Dirección de la web, sin barra final |
| `RESEND_API_KEY` | No | **No** | Envío de emails |
| `EMAIL_FROM` | No | No | Remitente de los emails |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | No | Sí | Captcha (se muestra en el navegador) |
| `TURNSTILE_SECRET_KEY` | No | **No** | Captcha (verificación en el servidor) |
