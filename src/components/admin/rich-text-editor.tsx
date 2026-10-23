"use client";

import { useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Underline,
  Undo2,
} from "lucide-react";

import { cn } from "@/lib/utils";

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "hover:bg-accent rounded p-1.5 [&_svg]:size-4",
        active && "bg-accent text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const chain = () => editor.chain().focus();
  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Dirección del enlace (vacío para quitarlo)", previous ?? "https://");
    if (url === null) return;
    if (url === "" || url === "https://") chain().unsetLink().run();
    else chain().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap gap-0.5 border-b p-1">
      <ToolbarButton label="Negrita" active={editor.isActive("bold")} onClick={() => chain().toggleBold().run()}>
        <Bold />
      </ToolbarButton>
      <ToolbarButton label="Cursiva" active={editor.isActive("italic")} onClick={() => chain().toggleItalic().run()}>
        <Italic />
      </ToolbarButton>
      <ToolbarButton label="Subrayado" active={editor.isActive("underline")} onClick={() => chain().toggleUnderline().run()}>
        <Underline />
      </ToolbarButton>
      <ToolbarButton label="Título" active={editor.isActive("heading", { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        <Heading2 />
      </ToolbarButton>
      <ToolbarButton label="Subtítulo" active={editor.isActive("heading", { level: 3 })} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
        <Heading3 />
      </ToolbarButton>
      <ToolbarButton label="Lista" active={editor.isActive("bulletList")} onClick={() => chain().toggleBulletList().run()}>
        <List />
      </ToolbarButton>
      <ToolbarButton label="Lista numerada" active={editor.isActive("orderedList")} onClick={() => chain().toggleOrderedList().run()}>
        <ListOrdered />
      </ToolbarButton>
      <ToolbarButton label="Cita" active={editor.isActive("blockquote")} onClick={() => chain().toggleBlockquote().run()}>
        <Quote />
      </ToolbarButton>
      <ToolbarButton label="Enlace" active={editor.isActive("link")} onClick={setLink}>
        <Link2 />
      </ToolbarButton>
      <ToolbarButton label="Deshacer" onClick={() => chain().undo().run()}>
        <Undo2 />
      </ToolbarButton>
      <ToolbarButton label="Rehacer" onClick={() => chain().redo().run()}>
        <Redo2 />
      </ToolbarButton>
    </div>
  );
}

// Editor de texto enriquecido. El HTML se envía en un input oculto con el
// nombre indicado y el servidor lo sanitiza antes de guardarlo.
export function RichTextEditor({
  name,
  defaultValue,
  id,
}: {
  name: string;
  defaultValue: string;
  id?: string;
}) {
  const [html, setHtml] = useState(defaultValue);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
    ],
    content: defaultValue,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        id: id ?? name,
        class: "prose-content min-h-40 px-3 py-2 outline-none",
      },
    },
    onUpdate: ({ editor }) => setHtml(editor.isEmpty ? "" : editor.getHTML()),
  });

  return (
    <div className="border-input focus-within:border-ring focus-within:ring-ring/50 rounded-md border shadow-xs focus-within:ring-[3px]">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
