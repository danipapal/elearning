# Instrucciones para Claude

- La especificación es `PLAN.md`. Se construye por fases (sección 12). Antes de cada fase, explicar qué se hará; al terminar, explicar cómo probarla y esperar confirmación de Daniel.
- Responder y escribir los textos de la interfaz en español rioplatense (vos).
- Next.js 16: `middleware` ahora se llama `proxy` (`src/proxy.ts`). `cacheComponents` está desactivado a propósito.
- Seguridad: RLS en toda tabla nueva (migración en `supabase/migrations/NNNN_descripcion.sql`), nunca exponer claves secretas al navegador, validar con Zod, verificar permisos en el servidor con `src/lib/auth.ts`.
- Tipos de la base en `src/types/database.ts` (mantener en sincronía con las migraciones).
- Antes de subir cambios: `npm run lint`, `npm run typecheck` y `npm run build`.

@AGENTS.md
