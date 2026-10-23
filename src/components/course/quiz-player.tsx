"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Award, CheckCircle2, Loader2, RotateCcw, XCircle } from "lucide-react";

import { submitQuiz, type SubmitQuizResult } from "@/app/cursos/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuestionType, QuizReview } from "@/types/database";

export type PlayerQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  options: { id: string; label: string }[];
};

type Props = {
  lessonId: string;
  questions: PlayerQuestion[];
  passingScore: number;
  maxAttempts: number | null;
  attemptsUsed: number;
  bestScore: number | null;
  passed: boolean;
  review: QuizReview | null;
  canSubmit: boolean;
  signupHref?: string;
};

export function QuizPlayer(props: Props) {
  const { lessonId, questions, passingScore, maxAttempts, canSubmit } = props;
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [outcome, setOutcome] = useState<SubmitQuizResult | null>(null);
  const [pending, startTransition] = useTransition();

  const result = outcome?.result;
  const attemptsUsed = result?.attempts_used ?? props.attemptsUsed;
  const passed = result?.passed || props.passed;
  const remaining = maxAttempts === null ? null : Math.max(0, maxAttempts - attemptsUsed);
  const exhausted = remaining === 0 && !passed;
  // Respuestas correctas visibles: tras aprobar o agotar intentos.
  const correctOptions = new Set(result?.correct_options ?? props.review?.correct_options ?? []);
  const explanations = outcome?.explanations ?? props.review?.explanations ?? {};
  const questionResults = new Map(result?.results.map((item) => [item.question_id, item.correct]));
  const locked = Boolean(result) || passed || exhausted;
  const answeredAll = questions.every((question) => (answers[question.id]?.length ?? 0) > 0);

  const choose = (question: PlayerQuestion, optionId: string) =>
    setAnswers((current) => {
      const selected = current[question.id] ?? [];
      if (question.type !== "multiple") return { ...current, [question.id]: [optionId] };
      return {
        ...current,
        [question.id]: selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId],
      };
    });

  const submit = () =>
    startTransition(async () => {
      setOutcome(await submitQuiz(lessonId, answers));
    });

  const retry = () => {
    setOutcome(null);
    setAnswers({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="grid gap-6" aria-label="Cuestionario">
      <div className="bg-muted/40 flex flex-wrap gap-x-6 gap-y-1 rounded-lg border px-4 py-3 text-sm">
        <span>
          Nota para aprobar: <strong>{passingScore}%</strong>
        </span>
        <span>
          Intentos:{" "}
          <strong>
            {attemptsUsed}
            {maxAttempts !== null ? ` de ${maxAttempts}` : ""}
          </strong>
        </span>
        {props.bestScore !== null && (
          <span>
            Mejor nota: <strong>{Math.max(props.bestScore, result?.score ?? 0)}%</strong>
          </span>
        )}
      </div>

      {result && (
        <div
          role="status"
          className={cn(
            "grid gap-2 rounded-lg border p-4",
            result.passed ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10",
          )}
        >
          <p className="text-lg font-semibold">
            {result.passed ? "¡Aprobaste! 🎉" : "Todavía no aprobaste"} · {result.score}%
          </p>
          <p className="text-sm">
            Respondiste bien {result.correct_count} de {result.total} preguntas.
            {!result.passed &&
              (remaining === 0
                ? " Ya no te quedan intentos."
                : ` Necesitás ${passingScore}% para aprobar.${remaining !== null ? ` Te quedan ${remaining} intentos.` : ""}`)}
          </p>
          {outcome?.certificateCode && (
            <Button asChild className="w-fit">
              <Link href={`/certificados/${outcome.certificateCode}`}>
                <Award /> ¡Terminaste el curso! Ver tu certificado
              </Link>
            </Button>
          )}
        </div>
      )}
      {outcome?.error && (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {outcome.error}
        </p>
      )}
      {!result && passed && (
        <p role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
          Ya aprobaste este cuestionario. Abajo podés repasar las respuestas correctas.
        </p>
      )}
      {!result && exhausted && (
        <p role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          Usaste todos los intentos de este cuestionario. Abajo podés ver las respuestas correctas.
        </p>
      )}

      <ol className="grid gap-5">
        {questions.map((question, index) => {
          const correct = questionResults.get(question.id);
          const selected = answers[question.id] ?? [];
          return (
            <li key={question.id} className="grid gap-3 rounded-lg border p-4">
              <fieldset className="grid gap-3">
                <legend className="mb-1 flex w-full items-start justify-between gap-3 font-medium">
                  <span>
                    {index + 1}. {question.prompt}
                    {question.type === "multiple" && (
                      <span className="text-muted-foreground block text-xs font-normal">
                        Puede haber más de una correcta.
                      </span>
                    )}
                  </span>
                  {correct === true && <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-label="Correcta" />}
                  {correct === false && <XCircle className="text-destructive size-5 shrink-0" aria-label="Incorrecta" />}
                </legend>
                {question.options.map((option) => {
                  const isSelected = selected.includes(option.id);
                  const isCorrect = correctOptions.has(option.id);
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm",
                        isSelected && !locked && "border-primary bg-primary/5",
                        locked && "cursor-default",
                        isCorrect && "border-emerald-500/60 bg-emerald-500/10",
                        locked && isSelected && !isCorrect && correctOptions.size > 0 && "border-destructive/60",
                      )}
                    >
                      <input
                        type={question.type === "multiple" ? "checkbox" : "radio"}
                        name={question.id}
                        className="mt-0.5 size-4 shrink-0"
                        checked={isSelected}
                        disabled={locked}
                        onChange={() => choose(question, option.id)}
                      />
                      <span className="flex-1">{option.label}</span>
                      {isCorrect && <span className="text-xs text-emerald-700 dark:text-emerald-400">Correcta</span>}
                    </label>
                  );
                })}
              </fieldset>
              {explanations[question.id] && (
                <p className="text-muted-foreground border-l-2 pl-3 text-sm">{explanations[question.id]}</p>
              )}
            </li>
          );
        })}
      </ol>

      {!canSubmit ? (
        <div className="bg-primary/5 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-sm">
          <span>Inscribite en el curso para responder y guardar tu nota.</span>
          {props.signupHref && (
            <Button asChild size="sm">
              <Link href={props.signupHref}>Inscribirme gratis</Link>
            </Button>
          )}
        </div>
      ) : !locked ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={submit} disabled={pending || !answeredAll}>
            {pending && <Loader2 className="animate-spin" />}
            Enviar respuestas
          </Button>
          {!answeredAll && <span className="text-muted-foreground text-sm">Respondé todas las preguntas.</span>}
        </div>
      ) : (
        result &&
        !result.passed &&
        remaining !== 0 && (
          <Button variant="outline" className="w-fit" onClick={retry}>
            <RotateCcw /> Intentar de nuevo
          </Button>
        )
      )}
    </section>
  );
}
