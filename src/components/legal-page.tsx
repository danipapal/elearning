// Página de texto legal. El HTML viene saneado (editor del panel) o es un
// texto modelo de la aplicación.
export function LegalPage({ title, html }: { title: string; html: string }) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">{title}</h1>
      <div className="prose-content mt-6" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}
