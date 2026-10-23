"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, BookOpen, History, LayoutDashboard, Tags, UserPlus, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Panel", icon: LayoutDashboard, exact: true },
  { href: "/admin/cursos", label: "Cursos", icon: BookOpen },
  { href: "/admin/categorias", label: "Categorías", icon: Tags },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/inscripciones", label: "Inscripción masiva", icon: UserPlus },
  { href: "/admin/certificados", label: "Certificados", icon: Award },
  { href: "/admin/auditoria", label: "Auditoría", icon: History },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Administración">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "hover:bg-accent flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap",
              active && "bg-accent font-medium",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
