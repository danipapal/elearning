"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Faq } from "@/types/database";

export function FaqEditor({ name, defaultValue }: { name: string; defaultValue: Faq[] }) {
  const [items, setItems] = useState<Faq[]>(defaultValue);

  const update = (index: number, patch: Partial<Faq>) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <div className="grid grid-cols-1 gap-3">
      {items.map((item, index) => (
        <div key={index} className="grid gap-2 rounded-md border p-3">
          <div className="flex gap-2">
            <Input
              placeholder="Pregunta"
              aria-label={`Pregunta ${index + 1}`}
              value={item.question}
              maxLength={300}
              onChange={(event) => update(index, { question: event.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Quitar pregunta ${index + 1}`}
              onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
            >
              <Trash2 />
            </Button>
          </div>
          <Textarea
            placeholder="Respuesta"
            aria-label={`Respuesta ${index + 1}`}
            value={item.answer}
            maxLength={3000}
            onChange={(event) => update(index, { answer: event.target.value })}
          />
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={items.length >= 30}
          onClick={() => setItems((current) => [...current, { question: "", answer: "" }])}
        >
          <Plus /> Agregar pregunta
        </Button>
      </div>
      <input type="hidden" name={name} value={JSON.stringify(items)} />
    </div>
  );
}
