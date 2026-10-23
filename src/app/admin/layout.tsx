import { AdminNav } from "@/components/admin/admin-nav";
import { ConfirmProvider } from "@/components/admin/confirm-dialog";
import { requireAdmin } from "@/lib/auth";

// Toda la sección /admin verifica el rol en el servidor, en cada request.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-8 md:grid-cols-[12rem_minmax(0,1fr)]">
      <aside>
        <AdminNav />
      </aside>
      <div className="min-w-0">
        <ConfirmProvider>{children}</ConfirmProvider>
      </div>
    </div>
  );
}
