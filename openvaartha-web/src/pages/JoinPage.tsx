import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribeToNewsletter, useArticles } from "@/lib/api-hooks";
import { BRAND, pageTitle, SITE_TITLE } from "@/lib/brand";
import { cn } from "@/lib/utils";

const PAGE_TITLE = "Create a free account";
const PAGE_DESCRIPTION =
  "Create a free Open Vaartha account to save stories, keep your reading history and get one digest each morning. No card, no paywall.";

const TAGLINE =
  "Journalism that answers to readers, not to advertisers, algorithms, or anyone with a chequebook.";
const TAGLINE_WORDS = TAGLINE.split(" ");

const BENEFITS = [
  {
    n: "01",
    title: "Your reading list, in one place",
    body: "Save a story on your phone and it is waiting on your laptop. Nothing gets lost in a browser tab.",
  },
  {
    n: "02",
    title: "Pick up where you stopped",
    body: "Reading history marks every article you open, so a long report is easy to return to.",
  },
  {
    n: "03",
    title: "One email each morning",
    body: "The day's reporting from Andhra Pradesh in a single digest. One message, then your day.",
  },
  {
    n: "04",
    title: "A record you can check",
    body: "Our standards are published and every correction is logged in public. You can hold us to both.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Create an account",
    body: "A name, an email address and a password. It takes a minute and costs nothing.",
  },
  {
    n: "02",
    title: "Save as you read",
    body: "Keep the stories you want to finish, or come back to, in your reading list.",
  },
  {
    n: "03",
    title: "Return when it suits you",
    body: "Open your list from any device, or start the morning with the digest.",
  },
];

const STANDARDS = [
  {
    to: "/editorial",
    title: "Editorial standards",
    body: "How we verify, source and attribute.",
  },
  {
    to: "/corrections",
    title: "Corrections",
    body: "Every correction we publish, in one log.",
  },
  {
    to: "/about",
    title: "About us",
    body: "Who runs the newsroom and who pays for it.",
  },
];

const FAQS = [
  {
    q: "Is Open Vaartha free to read?",
    a: "Yes. Every story is free to read and creating an account costs nothing. We do not put reporting behind a paywall.",
  },
  {
    q: "Do I need an account to read?",
    a: "No. Anyone can read the site. An account adds a reading list, your reading history and the morning digest.",
  },
  {
    q: "What does an account store?",
    a: "Your name, your email address, the stories you save and the stories you open. Our privacy policy sets out what we keep and why.",
  },
  {
    q: "Do you take advertising?",
    a: "Our reporting is not driven by advertising revenue. Donations to the FOSS Andhra Foundation keep the newsroom running.",
  },
  {
    q: "How often will you email me?",
    a: "One digest each morning with the day's reporting from Andhra Pradesh. You can unsubscribe from any message.",
  },
  {
    q: "How do you handle mistakes?",
    a: "We correct errors promptly and log every correction on the corrections page, so the record stays visible.",
  },
  {
    q: "Can I write for Open Vaartha?",
    a: "Yes. Once you have an account you can submit a contribution from the writer portal.",
  },
  {
    q: "I forgot my password. What now?",
    a: "Use the reset link on the sign in page. We email you a link to set a new password.",
  },
];

/** Fades a block in when it scrolls into view, unless the reader asked for less motion. */
const Reveal = ({ children, className }: { children: ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setShown(true);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className
      )}
    >
      {children}
    </div>
  );
};

const JoinPage = () => {
  const { data: latest = [] } = useArticles({ limit: 3 });
  const saved = latest.slice(0, 3);

  const [wordsOn, setWordsOn] = useState<boolean[]>(() => TAGLINE_WORDS.map(() => false));
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [note, setNote] = useState("");
  const [invalid, setInvalid] = useState(false);

  // Client-side title/description for in-app navigation; the server injects the
  // same values on a first load (see meta_service._STATIC_ROUTE_META["join"]).
  useEffect(() => {
    document.title = pageTitle(PAGE_TITLE);
    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute("content") ?? null;
    if (metaDesc) metaDesc.setAttribute("content", PAGE_DESCRIPTION);
    return () => {
      document.title = SITE_TITLE;
      if (metaDesc && prevDesc !== null) metaDesc.setAttribute("content", prevDesc);
    };
  }, []);

  // FAQ structured data for crawlers that do run JS.
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "join-faq-ld";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    });
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

  // Word-by-word tagline reveal, staggered by a few characters per word.
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      setWordsOn(TAGLINE_WORDS.map(() => true));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = Number((entry.target as HTMLElement).dataset.index);
          setWordsOn((current) => {
            if (current[index]) return current;
            const next = [...current];
            next[index] = true;
            return next;
          });
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0, rootMargin: "0px 0px -35% 0px" }
    );
    wordRefs.current.forEach((word) => word && observer.observe(word));
    return () => observer.disconnect();
  }, []);

  const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

  const handleSubscribe = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = email.trim();

    if (!isEmail(value)) {
      setInvalid(true);
      setStatus("error");
      setNote("Enter an email address, like name@example.com.");
      return;
    }

    setInvalid(false);
    setStatus("sending");
    setNote("");
    try {
      await subscribeToNewsletter(value);
      setStatus("done");
      setEmail("");
      setNote("You are on the list. The first digest arrives tomorrow morning.");
    } catch {
      setStatus("error");
      setNote("Subscription failed. Try again in a moment.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-20 sm:pt-24">
        {/* Hero */}
        <section className="px-4 sm:px-6 lg:px-10 py-14 sm:py-20 border-b border-border">
          <div className="max-w-screen-2xl mx-auto grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div>
              <span className="overline text-primary">Free account</span>
              <h1 className="poster text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02] mt-3">
                Keep the stories
                <br />
                that matter to
                <br />
                Andhra Pradesh.
              </h1>

              <p className="font-serif text-lg sm:text-xl text-muted-foreground mt-6 max-w-xl leading-relaxed">
                A free account saves what you read, keeps your place, and sends one digest each
                morning.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Button asChild size="lg">
                  <Link to="/register">Create free account</Link>
                </Button>
                <Link
                  to="/"
                  className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Read the front page
                </Link>
              </div>

              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-5">
                Free account, no card, no paywall
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Published by the FOSS Andhra Foundation. Every correction is logged in public.
              </p>
            </div>

            <aside
              className="rounded-2xl border border-border bg-[hsl(var(--surface))] p-6 sm:p-7"
              aria-label="A preview of the reading list"
            >
              <div className="flex items-baseline justify-between gap-3 border-b border-border pb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider">Your reading list</h2>
                <span className="text-xs text-muted-foreground">
                  {saved.length > 0 ? `${saved.length} saved` : "Empty list"}
                </span>
              </div>

              {saved.length > 0 ? (
                <ul className="divide-y divide-border">
                  {saved.map((article, index) => (
                    <li key={article.id || article.slug} className="flex items-start gap-3 py-3">
                      <span className="text-xs font-bold text-primary/50 tabular-nums mt-0.5">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-serif text-base font-bold leading-snug line-clamp-2">
                          {article.title}
                        </span>
                        <span className="block text-xs text-muted-foreground mt-1">
                          {article.category}
                          {article.readTime ? ` · ${article.readTime}` : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-sm text-muted-foreground leading-relaxed">
                  Saved stories appear here once you create an account.
                </p>
              )}

              <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3 mt-1">
                <span className="text-sm font-semibold">Morning digest</span>
                <span className="text-xs text-muted-foreground">One email each morning</span>
              </div>
            </aside>
          </div>
        </section>

        {/* Tagline reveal */}
        <section
          className="px-4 sm:px-6 lg:px-10 py-16 sm:py-24 border-b border-border"
          aria-label="What we promise readers"
        >
          <div className="max-w-screen-2xl mx-auto">
            <blockquote className="poster text-2xl sm:text-4xl lg:text-5xl font-semibold leading-[1.18] tracking-tight max-w-5xl">
              {TAGLINE_WORDS.map((word, index) => (
                <span
                  key={`${word}-${index}`}
                  ref={(element) => {
                    wordRefs.current[index] = element;
                  }}
                  data-index={index}
                  className={cn(
                    "inline-block transition-opacity duration-500 motion-reduce:transition-none",
                    wordsOn[index] ? "opacity-100" : "opacity-[0.12]"
                  )}
                >
                  {word}
                  {index < TAGLINE_WORDS.length - 1 ? "\u00a0" : ""}
                </span>
              ))}
            </blockquote>
          </div>
        </section>

        {/* Problem to solution */}
        <section
          className="px-4 sm:px-6 lg:px-10 py-16 sm:py-24 border-b border-border"
          aria-label="Why this newsroom exists"
        >
          <div className="max-w-screen-2xl mx-auto grid gap-8 md:grid-cols-2 md:gap-16">
            <h2 className="poster text-2xl sm:text-4xl font-bold tracking-tight leading-tight max-w-xl">
              The feed rewrites itself every hour. The record does not.
            </h2>
            <div className="space-y-4 max-w-2xl">
              <p className="text-base text-muted-foreground leading-relaxed">
                Feeds rank stories by what holds your attention. The story that mattered on Tuesday
                is gone by Thursday, and the correction, when it comes, is easy to miss.
              </p>
              <p className="text-base text-muted-foreground leading-relaxed">
                {BRAND.name} reports on politics, governance, society, technology and the
                environment across Andhra Pradesh. We publish our standards and log every
                correction where you can find it. An account gives you a place to keep what you
                read.
              </p>
              <p>
                <Link
                  to="/editorial"
                  className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Read our editorial standards
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section
          className="px-4 sm:px-6 lg:px-10 py-16 sm:py-24 border-b border-border"
          aria-label="What an account gives you"
        >
          <div className="max-w-screen-2xl mx-auto">
            <h2 className="poster text-2xl sm:text-4xl font-bold tracking-tight">
              What an account gives you
            </h2>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {BENEFITS.map((benefit) => (
                <Reveal
                  key={benefit.n}
                  className="rounded-2xl border border-border bg-[hsl(var(--surface))] p-6"
                >
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {benefit.n}
                    </span>
                    <h3 className="font-display text-lg font-bold tracking-tight">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{benefit.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          className="px-4 sm:px-6 lg:px-10 py-16 sm:py-24 border-b border-border"
          aria-label="How it works"
        >
          <div className="max-w-screen-2xl mx-auto">
            <h2 className="poster text-2xl sm:text-4xl font-bold tracking-tight">
              Three steps, then you are reading.
            </h2>

            <ol className="mt-8 grid gap-8 md:grid-cols-3">
              {STEPS.map((step) => (
                <li key={step.n}>
                  <Reveal className="border-t-2 border-foreground/80 pt-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {step.n}
                      </span>
                      <h3 className="font-display text-lg font-bold tracking-tight">
                        {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Standards */}
        <section
          className="px-4 sm:px-6 lg:px-10 py-16 sm:py-24 border-b border-border"
          aria-label="Our standards"
        >
          <div className="max-w-screen-2xl mx-auto">
            <h2 className="poster text-2xl sm:text-4xl font-bold tracking-tight">
              Read the rules we work under.
            </h2>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {STANDARDS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex h-full flex-col gap-2 rounded-2xl border border-border bg-[hsl(var(--surface))] p-6 transition-colors hover:border-primary/40 hover:bg-background"
                >
                  <h3 className="font-display text-base font-bold tracking-tight group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                  <span className="mt-auto pt-2 text-xs font-bold uppercase tracking-wider text-primary">
                    Read
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Morning digest */}
        <section
          className="px-4 sm:px-6 lg:px-10 py-16 sm:py-24 border-b border-border"
          aria-label="Morning digest"
        >
          <div className="max-w-screen-2xl mx-auto">
            <div className="rounded-2xl border border-border bg-[hsl(var(--surface))] p-6 sm:p-10">
              <div className="max-w-2xl">
                <h2 className="poster text-2xl sm:text-4xl font-bold tracking-tight">
                  One email each morning.
                </h2>
                <p className="text-base text-muted-foreground mt-3 leading-relaxed">
                  The day's reporting from Andhra Pradesh in a single digest. Unsubscribe whenever
                  you like.
                </p>

                <form onSubmit={handleSubscribe} className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <label htmlFor="join-email" className="sr-only">
                    Email address
                  </label>
                  <Input
                    id="join-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setInvalid(false);
                      if (status === "error" && note.startsWith("Enter an")) {
                        setStatus("idle");
                        setNote("");
                      }
                    }}
                    aria-invalid={invalid || undefined}
                    className="sm:max-w-sm"
                  />
                  <Button type="submit" size="lg" disabled={status === "sending" || status === "done"}>
                    {status === "sending" ? "Sending" : status === "done" ? "Subscribed" : "Get the morning digest"}
                  </Button>
                </form>
                <p
                  className={cn(
                    "text-xs mt-2 min-h-4",
                    status === "error" ? "text-destructive font-medium" : "text-muted-foreground"
                  )}
                  role="status"
                  aria-live="polite"
                >
                  {note}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          className="px-4 sm:px-6 lg:px-10 py-16 sm:py-24 border-b border-border"
          aria-label="Questions and answers"
        >
          <div className="max-w-screen-2xl mx-auto">
            <h2 className="poster text-2xl sm:text-4xl font-bold tracking-tight">
              Questions readers ask
            </h2>

            <div className="mt-8 max-w-3xl border-t border-border">
              {FAQS.map((faq) => (
                <details key={faq.q} className="group border-b border-border py-4">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-display text-base sm:text-lg font-bold tracking-tight [&::-webkit-details-marker]:hidden">
                    <span>{faq.q}</span>
                    <span
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-sm font-bold text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final call to action */}
        <section className="px-4 sm:px-6 lg:px-10 py-16 sm:py-24" aria-label="Create your account">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="poster text-2xl sm:text-4xl font-bold tracking-tight">
              Keep the stories that matter to you.
            </h2>
            <p className="text-base text-muted-foreground mt-4 leading-relaxed">
              A free account takes a minute. Your reading list, history and the morning digest come
              with it.
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg">
                <Link to="/register">Create free account</Link>
              </Button>
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-5">
              Free account, no card, no paywall
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default JoinPage;
