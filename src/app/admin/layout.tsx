import { requireAdmin } from "@/lib/auth";

// Toda la sección /admin verifica el rol en el servidor, en cada request.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return <div className="mx-auto w-full max-w-6xl px-4 py-12">{children}</div>;
}
