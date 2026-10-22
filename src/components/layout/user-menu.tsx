"use client";

import Link from "next/link";
import { BookOpen, LogOut, Shield } from "lucide-react";

import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string, email: string) {
  const source = name.trim() || email;
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserMenu({
  fullName,
  email,
  isAdmin,
}: {
  fullName: string;
  email: string;
  isAdmin: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menú de usuario">
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold">
            {initials(fullName, email)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="truncate">{fullName || "Mi cuenta"}</div>
          <div className="text-muted-foreground truncate text-xs font-normal">{email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/mi-aprendizaje">
            <BookOpen /> Mi aprendizaje
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield /> Administración
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <form action={logout}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut /> Cerrar sesión
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

