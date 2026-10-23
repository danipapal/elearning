"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, X } from "lucide-react";

import { saveQuiz, type QuizSaveResult } from "@/app/admin/cursos/quiz-actions";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { AdminQuiz, QuestionType } from "@/types/database";

type Option = { key: string; label: string; is_correct: boolean };
type Question = { key: string; type: QuestionType; prompt: string; explanation: string; options: Option[] };

const TYPE_LABELS: Record<QuestionType, string> = {
  single: "Opción única",
  multiple: "Varias correctas",
  true_false: "Verdadero o falso",
};

const key = () => crypto.randomUUID();
const trueFalse = (): Option[] => [
  { key: key(), label: "Verdadero", is_correct: true },
  { key: key(), label: "Falso", is_correct: false },
];
const emptyQuestion = (): Question => ({
  key: key(),
  type: "single",
  prompt: "",
  explanation: "",
  options: [
    { key: key(), label: "", is_correct: true },
    { key: key(), label: "", is_correct: false },
  ],
});

export function QuizEditor({ lessonId, quiz }: { lessonId: string; quiz: AdminQuiz | null }) {
  const [passingScore, setPassingScore] = useState(String(quiz?.passing_score ?? 70));
  const [maxAttempts, setMaxAttempts] = useState(quiz?.max_attempts ? String(quiz.max_attempts) : "");
  const [questions, setQuestions] = useState<Question[]>(
    quiz?.questions.length
      ? quiz.questions.map((q) => ({
          key: q.id,
          type: q.type,
          prompt: q.prompt,
          explanation: q.explanation,
          options: q.options.map((o) => ({ key: o.id, label: o.label, is_correct: o.is_correct })),
        }))
      : [emptyQuestion()],
  );
  const [result, setResult] = useState<QuizSaveResult | null>(null);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  const update = (index: number, change: (question: Question) => Question) =>
    setQuestions((list) => list.map((item, i) => (i === index ? change(item) : item)));

  const move = (index: number, delta: number) =>
    setQuestions((list) => {
      const next = [...list];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });

  const setType = (index: number, type: QuestionType) =>
    update(index, (question) => {
      if (type === "true_false") return { ...question, type, options: trueFalse() };
      let options = question.type === "true_false" ? emptyQuestion().options : question.options;
      // Al pasar a opción única queda solo la primera correcta.
      if (type === "single") {
        const first = options.findIndex((o) => o.is_correct);
        options = options.map((o, i) => ({ ...o, is_correct: i === Math.max(first, 0) }));
      }
      return { ...question, type, options };
    });

  const toggleCorrect = (index: number, optionIndex: number) =>
    update(index, (question) => ({
      ...question,
      options: question.options.map((o, i) =>
        question.type === "multiple"
          ? i === optionIndex
            ? { ...o, is_correct: !o.is_correct }
            : o
          : { ...o, is_correct: i === optionIndex },
      ),
    }));

  const save = () => {
    setResult(null);
    startTransition(async () => {
      setResult(
        await saveQuiz(lessonId, {
          passing_score: passingScore,
          max_attempts: maxAttempts === "" ? null : maxAttempts,
          questions: questions.map(({ type, prompt, explanation, options }) => ({
            type,
            prompt,
            explanation,
            options: options.map(({ label, is_correct }) => ({ label, is_correct })),
          })),
        }),
      );
    });
  };

  return (
    <section className="grid grid-cols-1 gap-6">
      <div>
        <h2 className="text-lg font-semibold">Cuestionario</h2>
        <p className="text-muted-foreground text-sm">
          La corrección es automática. El alumno completa la lección solo si aprueba.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="passingScore">Nota mínima para aprobar (%)</Label>
          <Input
            id="passingScore"
            type="number"
            min={0}
            max={100}
            value={passingScore}
            onChange={(event) => setPassingScore(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="maxAttempts">Intentos permitidos</Label>
          <Input
            id="maxAttempts"
            type="number"
            min={1}
            max={100}
            placeholder="Sin límite"
            value={maxAttempts}
            onChange={(event) => setMaxAttempts(event.target.value)}
          />
          <p className="text-muted-foreground text-xs">Dejalo vacío para intentos ilimitados.</p>
        </div>
      </div>

      <ol className="grid gap-4">
        {questions.map((question, index) => {
          const issue = result?.issues?.[`questions.${index}`];
          return (
            <li key={question.key} className={`grid gap-4 rounded-lg border p-4 ${issue ? "border-destructive" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">Pregunta {index + 1}</p>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Subir pregunta ${index + 1}`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Bajar pregunta ${index + 1}`}
                    disabled={index === questions.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Eliminar pregunta ${index + 1}`}
                    disabled={questions.length === 1}
                    onClick={async () => {
                      if (await confirm(`¿Eliminar la pregunta ${index + 1}?`)) {
                        setQuestions((list) => list.filter((_, i) => i !== index));
                      }
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
                <Textarea
                  aria-label={`Texto de la pregunta ${index + 1}`}
                  placeholder="Escribí la pregunta"
                  rows={2}
                  maxLength={1000}
                  value={question.prompt}
                  onChange={(event) => update(index, (q) => ({ ...q, prompt: event.target.value }))}
                />
                <NativeSelect
                  aria-label={`Tipo de la pregunta ${index + 1}`}
                  value={question.type}
                  onChange={(event) => setType(index, event.target.value as QuestionType)}
                >
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <fieldset className="grid gap-2">
                <legend className="text-muted-foreground mb-2 text-sm">
                  {question.type === "multiple"
                    ? "Opciones (marcá todas las correctas)"
                    : "Opciones (marcá la correcta)"}
                </legend>
                {question.options.map((option, optionIndex) => (
                  <div key={option.key} className="flex items-center gap-2">
                    <input
                      type={question.type === "multiple" ? "checkbox" : "radio"}
                      name={`correct-${question.key}`}
                      checked={option.is_correct}
                      onChange={() => toggleCorrect(index, optionIndex)}
                      aria-label={`Opción ${optionIndex + 1} correcta`}
                      className="size-4 shrink-0"
                    />
                    <Input
                      aria-label={`Opción ${optionIndex + 1} de la pregunta ${index + 1}`}
                      placeholder={`Opción ${optionIndex + 1}`}
                      maxLength={500}
                      value={option.label}
                      readOnly={question.type === "true_false"}
                      onChange={(event) =>
                        update(index, (q) => ({
                          ...q,
                          options: q.options.map((o, i) =>
                            i === optionIndex ? { ...o, label: event.target.value } : o,
                          ),
                        }))
                      }
                    />
                    {question.type !== "true_false" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Quitar opción ${optionIndex + 1}`}
                        disabled={question.options.length <= 2}
                        onClick={() =>
                          update(index, (q) => {
                            const options = q.options.filter((_, i) => i !== optionIndex);
                            if (!options.some((o) => o.is_correct)) options[0] = { ...options[0], is_correct: true };
                            return { ...q, options };
                          })
                        }
                      >
                        <X />
                      </Button>
                    )}
                  </div>
                ))}
                {question.type !== "true_false" && question.options.length < 10 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-fit"
                    onClick={() =>
                      update(index, (q) => ({
                        ...q,
                        options: [...q.options, { key: key(), label: "", is_correct: false }],
                      }))
                    }
                  >
                    <Plus /> Agregar opción
                  </Button>
                )}
              </fieldset>

              <Textarea
                aria-label={`Explicación de la pregunta ${index + 1}`}
                placeholder="Explicación (opcional): se muestra después de responder"
                rows={2}
                maxLength={1000}
                value={question.explanation}
                onChange={(event) => update(index, (q) => ({ ...q, explanation: event.target.value }))}
              />
              {issue && <p className="text-destructive text-sm">{issue}</p>}
            </li>
          );
        })}
      </ol>

      <Button
        type="button"
        variant="outline"
        className="w-fit"
        disabled={questions.length >= 100}
        onClick={() => setQuestions((list) => [...list, emptyQuestion()])}
      >
        <Plus /> Agregar pregunta
      </Button>

      <div className="bg-background/95 sticky bottom-0 -mx-4 grid gap-3 border-t px-4 py-3 backdrop-blur">
        {result?.error && (
          <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
            {Object.entries(result.issues ?? {}).find(([field]) => !field.startsWith("questions."))?.[1] ??
              result.error}
          </p>
        )}
        {result?.success && (
          <p role="status" className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            {result.success}
          </p>
        )}
        <div>
          <Button type="button" onClick={save} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Guardar cuestionario
          </Button>
        </div>
      </div>
    </section>
  );
}
