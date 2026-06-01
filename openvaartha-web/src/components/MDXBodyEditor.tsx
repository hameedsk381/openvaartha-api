import {
  MDXEditor,
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
import { useSyncExternalStore } from "react";
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

  return (
    <div data-color-scheme={isDark ? "dark" : "light"}>
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
