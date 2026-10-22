// Usado por Render para comprobar que el servicio está vivo.
export function GET() {
  return Response.json({ ok: true });
}
