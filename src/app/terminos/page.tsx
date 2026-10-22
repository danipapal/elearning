import type { Metadata } from "next";

export const metadata: Metadata = { title: "Términos y condiciones" };

export default function Page() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Términos y condiciones</h1>
      <p className="text-muted-foreground mt-4">Texto pendiente. Se completará en la fase 6 y será editable desde la configuración del sitio.</p>
    </article>
  );
}
