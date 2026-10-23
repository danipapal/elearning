"use client";

import { createContext, use, useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type Confirm = (message: string, options?: { confirmLabel?: string; destructive?: boolean }) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

// Confirmación propia con <dialog>, en lugar de window.confirm: los navegadores
// permiten bloquear esos avisos ("no mostrar más") y entonces el botón no hace nada.
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const [state, setState] = useState({ message: "", confirmLabel: "Confirmar", destructive: false });

  const confirm = useCallback<Confirm>((message, options) => {
    resolveRef.current?.(false);
    setState({
      message,
      confirmLabel: options?.confirmLabel ?? "Confirmar",
      destructive: options?.destructive ?? /eliminar|borrar|suspender/i.test(message),
    });
    dialogRef.current?.showModal();
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    dialogRef.current?.close();
    resolveRef.current?.(value);
    resolveRef.current = null;
  };

  return (
    <ConfirmContext value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        aria-labelledby="confirm-message"
        onCancel={() => close(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) close(false);
        }}
        className="bg-background text-foreground m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border p-0 shadow-lg backdrop:bg-black/50"
      >
        <div className="grid gap-5 p-5">
          <p id="confirm-message" className="text-base">
            {state.message}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => close(false)} autoFocus>
              Cancelar
            </Button>
            <Button variant={state.destructive ? "destructive" : "default"} onClick={() => close(true)}>
              {state.confirmLabel}
            </Button>
          </div>
        </div>
      </dialog>
    </ConfirmContext>
  );
}

export function useConfirm() {
  const confirm = use(ConfirmContext);
  if (!confirm) throw new Error("useConfirm necesita <ConfirmProvider>");
  return confirm;
}
