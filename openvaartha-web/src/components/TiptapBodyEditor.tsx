import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { useRef, useCallback, useEffect, useSyncExternalStore } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Minus, Undo2, Redo2,
  Heading1, Heading2, Heading3, Link as LinkIcon, Unlink,
  Image as ImageIcon, Table as TableIcon, AlignLeft,
  AlignCenter, AlignRight, Code,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/* ── dark mode listener ── */
function useIsDark() {
  return useSyncExternalStore(
    (cb) => {
      const obs = new MutationObserver(cb);
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => obs.disconnect();
    },
    () => document.documentElement.classList.contains("dark"),
  );
}

/* ── Plain text ↔ HTML helpers ── */
function textToHtml(text: string): string {
  if (!text) return "<p></p>";
  // If content already has HTML tags, pass through
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  // Otherwise convert plain text paragraphs to HTML
  return text
    .split(/\n\n+/)
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function htmlToText(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  // Convert <p>, <h1..h6>, <li>, <blockquote> blocks to double-newline separated text
  const blocks = tmp.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, blockquote, tr");
  if (blocks.length === 0) return tmp.textContent?.trim() || "";
  return Array.from(blocks)
    .map((b) => b.textContent?.trim() || "")
    .filter(Boolean)
    .join("\n\n");
}

/* ── Toolbar button ── */
function Btn({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors
        ${active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"}
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-border mx-1" />;
}

/* ── Main editor ── */
export default function TiptapBodyEditor({ value, onChange }: Props) {
  const isDark = useIsDark();
  const lastEmit = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: "Start writing your article body…" }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: textToHtml(value),
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const text = htmlToText(html);
      if (text !== lastEmit.current) {
        lastEmit.current = text;
        onChange(text);
      }
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose-base max-w-none min-h-[300px] px-4 py-3 focus:outline-none ${isDark ? "prose-invert" : ""}`,
      },
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (!editor) return;
    if (lastEmit.current !== value) {
      lastEmit.current = value;
      editor.commands.setContent(textToHtml(value));
    }
  }, [value, editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("URL:");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Image URL:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="tiptap-editor-wrapper rounded-lg border border-border overflow-hidden"
      style={{ background: isDark ? "hsl(var(--surface))" : "#fff" }}
    >
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border"
        style={{ background: isDark ? "hsl(var(--muted))" : "#f8f9fa" }}
      >
        <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
          <Undo2 className="h-4 w-4" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
          <Redo2 className="h-4 w-4" />
        </Btn>

        <Sep />

        <Btn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <Bold className="h-4 w-4" />
        </Btn>
        <Btn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <Italic className="h-4 w-4" />
        </Btn>
        <Btn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
          <UnderlineIcon className="h-4 w-4" />
        </Btn>
        <Btn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
          <Strikethrough className="h-4 w-4" />
        </Btn>
        <Btn active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code">
          <Code className="h-4 w-4" />
        </Btn>

        <Sep />

        <Btn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
          <Heading1 className="h-4 w-4" />
        </Btn>
        <Btn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
          <Heading2 className="h-4 w-4" />
        </Btn>
        <Btn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
          <Heading3 className="h-4 w-4" />
        </Btn>

        <Sep />

        <Btn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
          <List className="h-4 w-4" />
        </Btn>
        <Btn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
          <ListOrdered className="h-4 w-4" />
        </Btn>
        <Btn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
          <Quote className="h-4 w-4" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
          <Minus className="h-4 w-4" />
        </Btn>

        <Sep />

        <Btn active={editor.isActive("link")} onClick={editor.isActive("link") ? () => editor.chain().focus().unsetLink().run() : addLink} title={editor.isActive("link") ? "Remove link" : "Add link"}>
          {editor.isActive("link") ? <Unlink className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
        </Btn>
        <Btn onClick={addImage} title="Insert image">
          <ImageIcon className="h-4 w-4" />
        </Btn>
        <Btn onClick={addTable} title="Insert table">
          <TableIcon className="h-4 w-4" />
        </Btn>

        <Sep />

        <Btn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align left">
          <AlignLeft className="h-4 w-4" />
        </Btn>
        <Btn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align center">
          <AlignCenter className="h-4 w-4" />
        </Btn>
        <Btn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align right">
          <AlignRight className="h-4 w-4" />
        </Btn>
      </div>

      {/* Editor content area */}
      <EditorContent editor={editor} />
    </div>
  );
}
