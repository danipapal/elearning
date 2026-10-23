"use client";

import { useState, useTransition } from "react";
import { Loader2, Mail, KeyRound, Ban, CircleCheck, Trash2 } from "lucide-react";

import {
  deleteUser,
  resendVerification,
  sendPasswordReset,
  setUserRole,
  setUserStatus,
  unenrollUser,
  type ActionResult,
} from "@/app/admin/usuarios/actions";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { ROLE_LABELS } from "@/lib/users";
import type { UserRole, UserStatus } from "@/types/database";

function useResultAction() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const run = (action: () => Promise<ActionResult>, confirmMessage?: string) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setResult(null);
    startTransition(async () => {
      setResult(await action());
    });
  };
  return { pending, result, run };
}

function ResultMessage({ result }: { result: ActionResult | null }) {
  if (result?.error) {
    return (
      <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
        {result.error}
      </p>
    );
  }
  if (result?.success) {
    return (
      <p role="status" className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
        {result.success}
      </p>
    );
  }
  return null;
}

export function UserActions({
  userId,
  name,
  role,
  status,
  emailConfirmed,
  canManage,
  canGrantAdmin,
}: {
  userId: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  emailConfirmed: boolean;
  canManage: boolean;
  canGrantAdmin: boolean;
}) {
  const { pending, result, run } = useResultAction();
  const [newRole, setNewRole] = useState<UserRole>(role);
  const roles = (Object.keys(ROLE_LABELS) as UserRole[]).filter(
    (value) => canGrantAdmin || (value !== "admin" && value !== "superadmin"),
  );

  if (!canManage) {
    return (
      <p className="text-muted-foreground text-sm">
        Esta cuenta solo la puede gestionar un superadministrador, y nadie puede cambiar su propia cuenta desde acá.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid min-w-48 flex-1 gap-1 text-sm">
          <span className="font-medium">Rol</span>
          <NativeSelect value={newRole} onChange={(event) => setNewRole(event.target.value as UserRole)}>
            {roles.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </NativeSelect>
        </label>
        <Button
          disabled={pending || newRole === role}
          onClick={() =>
            run(
              () => setUserRole(userId, newRole),
              newRole === "admin" || newRole === "superadmin"
                ? `${name} va a tener acceso al panel de administración. ¿Continuar?`
                : undefined,
            )
          }
        >
          Cambiar rol
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {status === "active" ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(
                () => setUserStatus(userId, "suspended"),
                `¿Suspender a ${name}? No va a poder iniciar sesión ni ver los cursos hasta que la reactives.`,
              )
            }
          >
            <Ban /> Suspender
          </Button>
        ) : (
          <Button variant="outline" disabled={pending} onClick={() => run(() => setUserStatus(userId, "active"))}>
            <CircleCheck /> Reactivar
          </Button>
        )}
        {!emailConfirmed && (
          <Button variant="outline" disabled={pending} onClick={() => run(() => resendVerification(userId))}>
            <Mail /> Reenviar verificación
          </Button>
        )}
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(
              () => sendPasswordReset(userId),
              `¿Enviarle a ${name} un email para crear una contraseña nueva?`,
            )
          }
        >
          <KeyRound /> Restablecer contraseña
        </Button>
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() =>
            run(
              () => deleteUser(userId),
              `¿Eliminar la cuenta de ${name}? Se borran sus inscripciones y su progreso. No se puede deshacer.`,
            )
          }
        >
          <Trash2 /> Eliminar cuenta
        </Button>
        {pending && <Loader2 className="text-muted-foreground size-5 animate-spin self-center" />}
      </div>

      <ResultMessage result={result} />
    </div>
  );
}

export function UnenrollButton({ enrollmentId, courseTitle }: { enrollmentId: string; courseTitle: string }) {
  const { pending, result, run } = useResultAction();
  return (
    <div className="grid justify-items-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          run(
            () => unenrollUser(enrollmentId),
            `¿Dar de baja de "${courseTitle}"? Se conserva su progreso por si lo volvés a inscribir.`,
          )
        }
      >
        {pending && <Loader2 className="animate-spin" />}
        Dar de baja
      </Button>
      {result?.error && <p className="text-destructive text-xs">{result.error}</p>}
    </div>
  );
}
