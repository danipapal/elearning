"use client";

import { useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { createCategory, deleteCategory } from "@/app/admin/cursos/actions";
import { ActionButton } from "@/components/admin/action-button";
import { FormField, SaveButton } from "@/components/admin/form-fields";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/validation/form";

type Category = { id: string; name: string; slug: string; courses: number };

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [state, action] = useActionState<FormState, FormData>(createCategory, {});

  return (
    <div className="grid grid-cols-1 gap-6">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <FormField name="name" label="Nueva categoría" state={state} className="min-w-56 flex-1">
          <Input id="name" name="name" placeholder="Ej: Diseño" required maxLength={80} />
        </FormField>
        <SaveButton>
          <Plus /> Agregar
        </SaveButton>
      </form>
      {state.error && <p className="text-destructive text-sm">{state.error}</p>}

      {categories.length === 0 ? (
        <p className="text-muted-foreground text-sm">Todavía no hay categorías.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{category.name}</p>
                <p className="text-muted-foreground text-xs">
                  /{category.slug} · {category.courses} {category.courses === 1 ? "curso" : "cursos"}
                </p>
              </div>
              <ActionButton
                variant="ghost"
                size="icon"
                aria-label={`Eliminar ${category.name}`}
                action={() => deleteCategory(category.id)}
                confirmMessage={
                  category.courses > 0
                    ? `"${category.name}" tiene ${category.courses} cursos. Si la eliminás, esos cursos quedan sin categoría. ¿Continuar?`
                    : `¿Eliminar "${category.name}"?`
                }
              >
                <Trash2 />
              </ActionButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
