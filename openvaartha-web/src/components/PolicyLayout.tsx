import { useEffect, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BRAND, pageTitle, SITE_TITLE } from "@/lib/brand";

interface PolicyLayoutProps {
  eyebrow: string;
  title: string;
  intro: string;
  /** Meta description for this page (falls back to the site default). */
  description?: string;
  /** Human-readable "last updated" date. */
  updated: string;
  children: ReactNode;
}

/**
 * Shared shell for the trust/policy pages (Editorial, Corrections, Privacy,
 * Terms). Matches the About/Contact page design and sets the document title +
 * meta description client-side, restoring them on unmount.
 */
const PolicyLayout = ({ eyebrow, title, intro, description, updated, children }: PolicyLayoutProps) => {
  useEffect(() => {
    document.title = pageTitle(title);
    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute("content") ?? null;
    if (metaDesc && description) metaDesc.setAttribute("content", description);
    return () => {
      document.title = SITE_TITLE;
      if (metaDesc && prevDesc !== null) metaDesc.setAttribute("content", prevDesc);
    };
  }, [title, description]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-20 sm:pt-24 pb-16">
        <div className="max-w-screen-2xl mx-auto">
          <header className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14 border-b border-border bg-[hsl(var(--surface))]">
            <span className="overline text-primary">{eyebrow}</span>
            <h1 className="poster text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02] mt-2">
              {title}
            </h1>
            <p className="font-serif italic text-base sm:text-lg text-muted-foreground mt-4 max-w-2xl leading-relaxed">
              {intro}
            </p>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mt-6">
              Last updated · {updated}
            </p>
          </header>

          <section className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14 max-w-3xl">
            <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
              {children}
            </div>

            <div className="mt-12 pt-8 border-t border-border">
              <p className="font-serif italic text-sm text-muted-foreground">Questions about this policy?</p>
              <a
                href={`mailto:${BRAND.contactEmail}`}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary hover:underline underline-offset-4"
              >
                {BRAND.contactEmail} <AnimatedIcon animationType="arrowUpRight"><ArrowUpRight className="h-3.5 w-3.5" /></AnimatedIcon>
              </a>
              <p className="mt-4 text-sm text-muted-foreground">
                See also our{" "}
                <Link to="/editorial" className="text-primary hover:underline">Editorial Standards</Link>,{" "}
                <Link to="/corrections" className="text-primary hover:underline">Corrections Policy</Link>,{" "}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, and{" "}
                <Link to="/terms" className="text-primary hover:underline">Terms of Use</Link>.
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PolicyLayout;
