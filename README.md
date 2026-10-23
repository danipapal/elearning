# Plataforma de cursos online

Plataforma propia de cursos con **Next.js 16**, **Supabase** (base de datos, autenticación y archivos) y **Render** (hosting).
La especificación completa está en [PLAN.md](PLAN.md).

## Estado

| Fase | Contenido | Estado |
| --- | --- | --- |
| 1. Base | Next.js, Supabase, autenticación, roles, diseño, despliegue | Lista |
| 2. Cursos | Panel de cursos, módulos, lecciones, videos y PDF | Lista |
| 3. Alumno | Catálogo, inscripción, reproductor, progreso | Lista |
| 4. Usuarios | Listado, fichas, inscripciones manuales, dashboard, auditoría | Lista |
| 5. Evaluación | Cuestionarios y certificados | En prueba |
| 6. Pulido y seguridad | Rate limiting, emails, SEO, textos legales | Pendiente |
| 7. Monetización | Planes, pagos, cupones | Pendiente |

## Configuración

Seguí la guía paso a paso: [docs/configuracion.md](docs/configuracion.md).

## Base de datos

Las migraciones están en `supabase/migrations/` y se ejecutan **en orden**, una sola vez cada una,
en Supabase > SQL Editor:

1. `0001_profiles_y_roles.sql` (fase 1)
2. `0002_cursos.sql` (fase 2)
3. `0003_inscripciones.sql` (fase 3)
4. `0004_admin_usuarios.sql` (fase 4)
5. `0005_cuestionarios_certificados.sql` (fase 5)

## Desarrollo

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm run build
```

## Estructura

```
src/
  app/
    (auth)/          login, registro, recuperar y nueva contraseña + server actions
    auth/confirm/    destino de los enlaces de los emails de Supabase
    admin/           panel de administración (verifica rol admin en el servidor)
      cursos/        cursos, temario, lecciones y sus server actions
      categorias/    categorías del catálogo
    cursos/          catálogo, página del curso y reproductor de lecciones
    mi-aprendizaje/  panel del alumno (requiere sesión)
    api/descargas/   descarga de PDF con enlaces firmados
  components/        UI (shadcn/ui) y layout
  lib/
    auth.ts          lectura de sesión y permisos (único punto de acceso)
    supabase/        clientes de Supabase para navegador, servidor y proxy
    validation/      esquemas Zod
  proxy.ts           refresca la sesión y protege rutas (antes "middleware")
supabase/migrations/ SQL de la base de datos (con RLS)
render.yaml          blueprint de Render
```

## Seguridad

- RLS activado en todas las tablas; el rol y el estado del usuario no se pueden modificar desde el navegador.
- Solo variables `NEXT_PUBLIC_*` llegan al navegador; las claves secretas solo en el servidor (Render).
- Permisos verificados en el servidor en cada página y acción, además de RLS.
- Validación con Zod en todos los formularios y cabeceras de seguridad (HSTS, X-Frame-Options, etc.).
