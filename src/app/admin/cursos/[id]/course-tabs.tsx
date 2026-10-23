"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function CourseTabs({ courseId }: { courseId: string }) {
  const pathname = usePathname();
  const base = `/admin/cursos/${courseId}`;
  const tabs = [
    { href: base, label: "Información", active: pathname === base },
    {
      href: `${base}/temario`,
      label: "Temario",
      active: pathname.startsWith(`${base}/temario`) || pathname.startsWith(`${base}/lecciones`),
    },
  ];
  return (
    <nav className="flex gap-1 border-b" aria-label="Secciones del curso">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 border-transparent px-3 py-2 text-sm",
            tab.active ? "border-primary font-medium" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
