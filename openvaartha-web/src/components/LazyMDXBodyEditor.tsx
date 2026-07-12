import { lazy, Suspense } from "react";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";

// Tiptap-based rich-text editor (~50KB gzip vs ~492KB for the old MDX editor).
// Only loaded on admin article form and contributor write page.
const TiptapBodyEditor = lazy(() => import("./TiptapBodyEditor"));

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function LazyBodyEditor(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-40 border border-border rounded-md bg-[hsl(var(--surface))]">
          <LoaderCircle className="h-5 w-5 text-muted-foreground" animate />
        </div>
      }
    >
      <TiptapBodyEditor {...props} />
    </Suspense>
  );
}
