import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { ArticleCorrection } from "@/lib/types";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}

function CorrectionCard({ correction }: { correction: ArticleCorrection }) {
  const isRetraction = correction.severity === "retraction";

  return (
    <li className={isRetraction ? "rounded-lg bg-red-50 p-3 dark:bg-red-950/20" : "rounded-lg p-3"}>
      <p className="font-semibold capitalize flex items-start gap-2">
        {isRetraction ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /> : null}
        <span>{isRetraction ? "Retraction" : correction.severity}: {correction.summary}</span>
      </p>
      {correction.reason && (
        <p className="mt-1.5 text-muted-foreground"><span className="font-medium text-foreground">Reason:</span> {correction.reason}</p>
      )}
      {correction.details && <p className="mt-1.5 text-muted-foreground">{correction.details}</p>}
      <p className="mt-2 text-xs text-muted-foreground">
        {correction.editorName ? `By ${correction.editorName} · ` : ""}
        {formatDate(correction.correctedAt)}
      </p>
    </li>
  );
}

export function ArticleCorrections({ corrections }: { corrections: ArticleCorrection[] }) {
  if (!corrections.length) return null;

  return (
    <section className="my-8 rounded-xl border border-amber-300/70 bg-amber-50/50 p-5 dark:bg-amber-950/10" aria-label="Corrections and updates">
      <h2 className="flex items-center gap-2 text-base font-bold"><AlertTriangle className="h-4 w-4" /> Corrections & updates</h2>
      <ul className="mt-3 space-y-3 text-sm">
        {corrections.map((correction) => (
          <CorrectionCard key={correction.id} correction={correction} />
        ))}
      </ul>
    </section>
  );
}
