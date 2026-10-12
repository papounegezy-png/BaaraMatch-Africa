import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon } from "lucide-react";

// Deliberately narrow: only the extensions this form actually needs. No
// tables, images, text color, or emoji — a job posting doesn't need that
// depth and every extra extension is another thing to sanitize on display.
const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [2] },
  }),
  // Not in StarterKit — needed separately for the "Souligné" toolbar button.
  Underline,
  Link.configure({
    openOnClick: false,
    autolink: false,
  }),
  Placeholder.configure({
    placeholder: ({ editor }) => {
      if (editor.isEmpty) {
        return "Décrivez le poste. Exemple de structure : «Missions» en titre suivi d'une liste, puis «Profil recherché» en titre suivi d'une liste.";
      }
      return "";
    },
  }),
];

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex items-center justify-center h-9 min-w-9 sm:h-8 sm:min-w-8 rounded-md px-1.5 text-sm transition-colors ${
        active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const headingValue = editor.isActive("heading", { level: 2 }) ? "h2" : "paragraph";

  return (
    <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 border-b p-1.5 sm:p-2" role="toolbar" aria-label="Mise en forme">
      <Select
        value={headingValue}
        onValueChange={(value) => {
          if (value === "h2") {
            editor.chain().focus().setHeading({ level: 2 }).run();
          } else {
            editor.chain().focus().setParagraph().run();
          }
        }}
      >
        <SelectTrigger className="h-9 sm:h-8 w-32 text-xs" aria-label="Style de paragraphe" data-testid="select-editor-block-type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="paragraph">Paragraphe</SelectItem>
          <SelectItem value="h2">Titre</SelectItem>
        </SelectContent>
      </Select>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        label="Mettre en gras"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        label="Mettre en italique"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        label="Souligner"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-0.5" aria-hidden="true" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        label="Liste à puces"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        label="Liste numérotée"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-0.5" aria-hidden="true" />

      <ToolbarButton
        onClick={() => {
          if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          const url = window.prompt("URL du lien :");
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        active={editor.isActive("link")}
        label="Insérer un lien"
      >
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

/**
 * Tiptap-based rich text editor, isolated so it can be reused anywhere a
 * short, structured HTML field is needed later — not just the job form.
 * Only produces HTML for: <p> <strong> <em> <u> <h2> <ul> <ol> <li> <a>.
 * Sanitize on display with sanitizeJobDescriptionHtml (see
 * lib/sanitize-html.ts) — never trust this HTML as safe to render as-is,
 * even though it only ever comes from this editor here.
 */
export function RichTextEditor({
  value,
  onChange,
  editable = true,
  "aria-label": ariaLabel = "Description de l'offre",
}: {
  value: string;
  onChange: (html: string) => void;
  editable?: boolean;
  "aria-label"?: string;
}) {
  const editor = useEditor({
    extensions: editorExtensions,
    content: value,
    editable,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": ariaLabel,
        "aria-required": "true",
        class: "prose prose-sm max-w-none focus:outline-none min-h-[220px] px-3 py-2 sm:px-4 sm:py-3",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // The editor is created once (Tiptap doesn't re-sync `content` on prop
  // changes) — when a draft loads asynchronously after mount, push the
  // fetched HTML in explicitly rather than re-creating the editor.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  return (
    <div className="rounded-md border" data-testid="rich-text-editor">
      <Toolbar editor={editor} />
      {/* The ProseMirror area drops its outline (focus:outline-none above):
          show the same ring as <Input> on the writing area, inset so the
          rounded border doesn't clip it. */}
      <div className="rounded-b-md focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring">
        <EditorContent editor={editor} data-testid="rich-text-editor-content" />
      </div>
    </div>
  );
}
