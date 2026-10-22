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
3. **Authentication > Emails > Templates** (plantillas). Esto hace que los enlaces de los emails funcionen aunque el alumno los abra en otro navegador o en el celular:
   - **Confirm signup:** en el HTML, reemplazá `{{ .ConfirmationURL }}` por:
     ```
     {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/mi-aprendizaje
     ```
   - **Reset Password:** reemplazá `{{ .ConfirmationURL }}` por:
     ```
     {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
     ```
   Podés traducir el texto de los emails al español en el mismo lugar.

> El servidor de email incluido en Supabase solo envía unos pocos emails por hora. Alcanza para probar;
> en la fase 6 configuramos Resend para producción.

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
