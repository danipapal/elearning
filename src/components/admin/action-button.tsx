"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

// Botón que ejecuta una server action, opcionalmente pidiendo confirmación.
export function ActionButton({
  action,
  confirmMessage,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "onClick" | "action"> & {
  action: () => Promise<unknown>;
  confirmMessage?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      disabled={pending || props.disabled}
      onClick={() => {
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        startTransition(async () => {
          await action();
        });
      }}
      {...props}
    >
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}
