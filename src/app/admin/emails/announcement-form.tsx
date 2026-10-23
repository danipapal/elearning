"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Megaphone, Send } from "lucide-react";

import {
  countAnnouncementRecipients,
  sendAnnouncement,
  type AnnouncementResult,
} from "@/app/admin/emails/actions";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { FormField, FormStatus } from "@/components/admin/form-fields";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

export function AnnouncementForm({
  courses,
  canSend,
}: {
  courses: { id: string; title: string }[];
  canSend: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [result, setResult] = useState<AnnouncementResult>({});
  const [formKey, setFormKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  const read = () => {
    const data = new FormData(formRef.current!);
    return {
      subject: String(data.get("subject") ?? ""),
      body_html: String(data.get("body_html") ?? ""),
      course_id: String(data.get("course_id") ?? ""),
    };
  };

  const send = (test: boolean) =>
    startTransition(async () => {
      setResult({});
      const input = read();
      if (!test) {
        const counted = await countAnnouncementRecipients(input.course_id);
        if (counted.error) return setResult({ error: counted.error });
        if (!counted.count) return setResult({ error: "No hay destinatarios para este anuncio." });
        const people = counted.count === 1 ? "1 persona" : `${counted.count} personas`;
        if (!(await confirm(`¿Enviar el anuncio a ${people}? No se puede deshacer.`))) return;
      }
      const response = await sendAnnouncement(input, test);
      setResult(response);
      if (!test && response.success) setFormKey((key) => key + 1);
    });

  return (
    <form key={formKey} ref={formRef} onSubmit={(event) => event.preventDefault()} className="grid gap-4" noValidate>
      <FormField name="course_id" label="Destinatarios" state={result}>
        <NativeSelect id="course_id" name="course_id" defaultValue="">
          <option value="">Todos los usuarios activos</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              Inscritos en: {course.title}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField name="subject" label="Asunto" state={result}>
        <Input id="subject" name="subject" maxLength={150} required />
      </FormField>
      <FormField
        name="body_html"
        label="Mensaje"
        hint="Podés usar {nombre}. Al final se agrega un aviso para darse de baja de los anuncios."
        state={result}
      >
        <RichTextEditor name="body_html" defaultValue="" />
      </FormField>
      <FormStatus state={result} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pending || !canSend} onClick={() => send(false)}>
          {pending ? <Loader2 className="animate-spin" /> : <Megaphone />} Enviar anuncio
        </Button>
        <Button type="button" variant="outline" disabled={pending || !canSend} onClick={() => send(true)}>
          <Send /> Enviarme una prueba
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Solo lo reciben usuarios activos con el email confirmado que no se dieron de baja de los anuncios.
      </p>
    </form>
  );
}
