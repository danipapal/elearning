import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">Página no encontrada</h1>
      <p className="text-muted-foreground">La página que buscás no existe o se movió.</p>
      <Button asChild>
        <Link href="/">Volver al inicio</Link>
      </Button>
    </div>
  );
}
