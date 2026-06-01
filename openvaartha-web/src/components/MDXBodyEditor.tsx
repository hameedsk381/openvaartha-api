import {
  MDXEditor,
  MDXEditorMethods,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
} from "@mdxeditor/editor";
import { useEffect, useRef, useSyncExternalStore } from "react";
import "@mdxeditor/editor/style.css";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

function useIsDark() {
  return useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    },
    () => document.documentElement.classList.contains("dark"),
  );
}

export default function MDXBodyEditor({ value, onChange }: Props) {
  const isDark = useIsDark();
  const editorRef = useRef<MDXEditorMethods>(null);
  const externalValue = useRef(value);

  useEffect(() => {
    if (editorRef.current && externalValue.current !== value) {
      externalValue.current = value;
      editorRef.current.setMarkdown(value);
    }
  }, [value]);

  const handleChange = (newValue: string) => {
    externalValue.current = newValue;
    onChange(newValue);
  };

  return (
    <div data-color-scheme={isDark ? "dark" : "light"} className="mdx-editor-wrapper">
      <style>{`
        .mdx-editor-wrapper .mdxeditor {
          background: ${isDark ? "hsl(var(--surface))" : "#fff"};
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
        }
        .mdx-editor-wrapper .mdxeditor-toolbar {
          background: ${isDark ? "hsl(var(--muted))" : "#f8f9fa"};
          border-bottom: 1px solid hsl(var(--border));
        }
        .mdx-editor-wrapper .mdxeditor-toolbar button {
          color: ${isDark ? "hsl(var(--foreground))" : "#333"};
        }
        .mdx-editor-wrapper .mdxeditor-toolbar button:hover {
          background: ${isDark ? "hsl(var(--accent))" : "#e9ecef"};
        }
        .mdx-editor-wrapper .mdxeditor-rich-text-editor,
        .mdx-editor-wrapper .cm-editor {
          background: ${isDark ? "hsl(var(--surface))" : "#fff"};
          color: ${isDark ? "hsl(var(--foreground))" : "#333"};
        }
        .mdx-editor-wrapper .mdxeditor-rich-text-editor .cm-editor .cm-scroller {
          color: ${isDark ? "hsl(var(--foreground))" : "#333"};
        }
        .mdx-editor-wrapper .mdxeditor-rich-text-editor .cm-editor .cm-gutters {
          background: ${isDark ? "hsl(var(--muted))" : "#f8f9fa"};
          color: ${isDark ? "hsl(var(--muted-foreground))" : "#666"};
        }
        .mdx-editor-wrapper .mdxeditor-rich-text-editor .cm-editor .cm-activeLine {
          background: ${isDark ? "hsl(var(--accent) / 0.3)" : "rgba(0,0,0,0.03)"};
        }
        .mdx-editor-wrapper .mdxeditor-popup-container {
          background: ${isDark ? "hsl(var(--surface))" : "#fff"};
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .mdx-editor-wrapper .mdxeditor-popup-container input,
        .mdx-editor-wrapper .mdxeditor-popup-container select {
          background: ${isDark ? "hsl(var(--input))" : "#fff"};
          color: ${isDark ? "hsl(var(--foreground))" : "#333"};
          border: 1px solid hsl(var(--border));
          border-radius: 0.375rem;
        }
      `}</style>
      <MDXEditor
        ref={editorRef}
        markdown={value}
        onChange={handleChange}
        contentEditableClassName={`prose prose-sm sm:prose-base max-w-none min-h-[300px] px-4 py-3 focus:outline-none ${isDark ? "prose-invert" : ""}`}
        plugins={[
          toolbarPlugin({
            toolbarContents: () => (
              <>
                <UndoRedo />
                <BoldItalicUnderlineToggles />
                <BlockTypeSelect />
                <CreateLink />
                <InsertImage />
                <InsertTable />
                <InsertThematicBreak />
                <ListsToggle />
              </>
            ),
          }),
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          imagePlugin(),
          tablePlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: "text" }),
          codeMirrorPlugin({ codeBlockLanguages: { text: "Plain", js: "JavaScript", ts: "TypeScript", python: "Python", bash: "Bash", json: "JSON", html: "HTML", css: "CSS" } }),
        ]}
      />
    </div>
  );
}

function useIsDark() {
  return useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    },
    () => document.documentElement.classList.contains("dark"),
  );
}

export default function MDXBodyEditor({ value, onChange }: Props) {
  const isDark = useIsDark();

  return (
    <div data-color-scheme={isDark ? "dark" : "light"} className="mdx-editor-wrapper">
      <style>{`
        .mdx-editor-wrapper .mdxeditor {
          background: ${isDark ? "hsl(var(--surface))" : "#fff"};
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
        }
        .mdx-editor-wrapper .mdxeditor-toolbar {
          background: ${isDark ? "hsl(var(--muted))" : "#f8f9fa"};
          border-bottom: 1px solid hsl(var(--border));
        }
        .mdx-editor-wrapper .mdxeditor-toolbar button {
          color: ${isDark ? "hsl(var(--foreground))" : "#333"};
        }
        .mdx-editor-wrapper .mdxeditor-toolbar button:hover {
          background: ${isDark ? "hsl(var(--accent))" : "#e9ecef"};
        }
        .mdx-editor-wrapper .mdxeditor-rich-text-editor,
        .mdx-editor-wrapper .cm-editor {
          background: ${isDark ? "hsl(var(--surface))" : "#fff"};
          color: ${isDark ? "hsl(var(--foreground))" : "#333"};
        }
        .mdx-editor-wrapper .mdxeditor-rich-text-editor .cm-editor .cm-scroller {
          color: ${isDark ? "hsl(var(--foreground))" : "#333"};
        }
        .mdx-editor-wrapper .mdxeditor-rich-text-editor .cm-editor .cm-gutters {
          background: ${isDark ? "hsl(var(--muted))" : "#f8f9fa"};
          color: ${isDark ? "hsl(var(--muted-foreground))" : "#666"};
        }
        .mdx-editor-wrapper .mdxeditor-rich-text-editor .ͼ1 .cm-activeLine {
          background: ${isDark ? "hsl(var(--accent) / 0.3)" : "rgba(0,0,0,0.03)"};
        }
        .mdx-editor-wrapper .mdxeditor-popup-container {
          background: ${isDark ? "hsl(var(--surface))" : "#fff"};
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .mdx-editor-wrapper .mdxeditor-popup-container input,
        .mdx-editor-wrapper .mdxeditor-popup-container select {
          background: ${isDark ? "hsl(var(--input))" : "#fff"};
          color: ${isDark ? "hsl(var(--foreground))" : "#333"};
          border: 1px solid hsl(var(--border));
          border-radius: 0.375rem;
        }
      `}</style>
      <MDXEditor
        markdown={value}
        onChange={onChange}
        contentEditableClassName="prose prose-sm sm:prose-base dark:prose-invert max-w-none min-h-[300px] px-4 py-3 focus:outline-none"
        plugins={[
          toolbarPlugin({
            toolbarContents: () => (
              <>
                <UndoRedo />
                <BoldItalicUnderlineToggles />
                <BlockTypeSelect />
                <CreateLink />
                <InsertImage />
                <InsertTable />
                <InsertThematicBreak />
                <ListsToggle />
              </>
            ),
          }),
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          imagePlugin(),
          tablePlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: "text" }),
          codeMirrorPlugin({ codeBlockLanguages: { text: "Plain", js: "JavaScript", ts: "TypeScript", python: "Python", bash: "Bash", json: "JSON", html: "HTML", css: "CSS" } }),
        ]}
      />
    </div>
  );
}
