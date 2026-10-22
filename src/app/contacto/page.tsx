import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contacto" };

export default function Page() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Contacto</h1>
      <p className="text-muted-foreground mt-4">Próximamente vas a poder escribirnos desde esta página.</p>
    </article>
  );
}
