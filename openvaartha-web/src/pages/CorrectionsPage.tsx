import { Link } from "react-router-dom";
import PolicyLayout from "@/components/PolicyLayout";
import { BRAND } from "@/lib/brand";
import { useCorrectionsIndex } from "@/lib/api-hooks";

function CorrectionsIndex() {
  const { data, isLoading, isError } = useCorrectionsIndex({ limit: 50 });

  return (
    <section className="mt-10 rounded-xl border border-amber-300/60 bg-amber-50/40 p-5 dark:bg-amber-950/10">
      <h2 className="text-xl font-bold">Public corrections index</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Every substantive correction and retraction we have published, in reverse chronological order.
      </p>

      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading corrections…</p>}
      {isError && <p className="mt-4 text-sm text-muted-foreground">Could not load the corrections index. Please try again later.</p>}
      {data && data.length === 0 && !isLoading && (
        <p className="mt-4 text-sm text-muted-foreground">No corrections recorded yet.</p>
      )}

      {data && data.length > 0 && (
        <ul className="mt-4 space-y-3">
          {data.map((item) => (
            <li key={item.id} className="border-b border-amber-300/40 pb-3 last:border-0">
              <Link
                to={`/article/${item.articleSlug}`}
                className="font-medium text-foreground hover:underline"
              >
                {item.articleTitle}
              </Link>
              <p className={`text-sm ${item.severity === "retraction" ? "font-semibold text-red-600" : "text-muted-foreground"}`}>
                <span className="capitalize">{item.severity}</span> — {item.summary}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(item.correctedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const CorrectionsPage = () => (
  <PolicyLayout
    eyebrow="Accountability"
    title="Corrections Policy"
    intro="If we get something wrong, we fix it — openly, and on the record."
    description="How Open Vaartha reports, reviews, and corrects errors, transparently and promptly."
    updated="9 July 2026"
  >
    <h2>Our commitment</h2>
    <p>
      Accuracy is the foundation of trust. When {BRAND.name} publishes something that is
      wrong or misleading, we correct it as quickly as we can and are transparent about what
      changed.
    </p>

    <h2>How to report an error</h2>
    <p>
      Email us at <a href={`mailto:${BRAND.contactEmail}`}>{BRAND.contactEmail}</a> with the
      article title or link and a description of the problem, or message us on any of the
      channels listed on our <Link to="/contact">Contact</Link> page. Please include a source
      if you have one — it helps us verify and fix things faster.
    </p>

    <h2>How we handle corrections</h2>
    <ul>
      <li>
        <strong>Minor fixes</strong> — typos, formatting, and obvious slips are corrected
        without a formal note.
      </li>
      <li>
        <strong>Substantive corrections</strong> — when a fact, name, figure, or claim was
        wrong, we correct the article and add a dated note explaining what changed.
      </li>
      <li>
        <strong>Significant errors</strong> — when a mistake materially affects the meaning of
        a story, we mark the correction prominently so readers who saw the original are not
        misled.
      </li>
    </ul>

    <h2>Updates to developing stories</h2>
    <p>
      For live and developing coverage, we add timestamped updates as new information is
      confirmed. Earlier information is not silently removed; the timeline reflects what was
      known when.
    </p>

    <h2>Removal requests</h2>
    <p>
      We do not un-publish accurate reporting on request. If you believe content is
      inaccurate, unlawful, or infringes your rights, contact us at{" "}
      <a href={`mailto:${BRAND.contactEmail}`}>{BRAND.contactEmail}</a> and we will review it.
    </p>

    <CorrectionsIndex />
  </PolicyLayout>
);

export default CorrectionsPage;
