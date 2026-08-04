import { useState } from "react";
import Navbar from '../components/Navbar';
import Footer from '@/components/Footer';
import { Link } from "react-router-dom";
import { Heart, HandCoins, Copy, Mail, Share2, ArrowUpRight } from 'lucide-react';
import { AnimatedIcon } from '@/components/ui/animated-icon';
import { BRAND, pageTitle } from '@/lib/brand';
import { toast } from "sonner";

const SupportPage = () => {
  const [copied, setCopied] = useState(false);
  const external = BRAND.supportUrl.trim().length > 0;
  const upi = BRAND.supportUpiId.trim();

  const handleUpiCopy = async () => {
    if (!upi) return;
    try {
      await navigator.clipboard.writeText(upi);
      setCopied(true);
      toast.success("UPI ID copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — copy it manually below.");
    }
  };

  const handleShare = async () => {
    const text = `Help keep ${BRAND.name} independent — an open news platform, free and ad-free. ${window.location.href}`;
    if (navigator.share) {
      try { await navigator.share({ title: BRAND.name, text }); } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        toast.success("Link copied");
      } catch {
        toast.error("Couldn't copy — share the page manually.");
      }
    }
  };

  document.title = pageTitle("Support us");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-20 sm:pt-24 pb-16">
        <div className="max-w-screen-2xl mx-auto">
          <header className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14 border-b border-border bg-[hsl(var(--surface))]">
            <span className="overline text-primary">Support us</span>
            <h1 className="poster text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02] mt-2">
              Keep journalism free.
            </h1>
            <p className="font-serif italic text-base sm:text-lg text-muted-foreground mt-4 max-w-2xl leading-relaxed">
              {BRAND.name} is reader-funded and ad-free. No paywalls, no corporate
              sponsors — just open journalism built by Gen Z, for a freer internet.
            </p>
          </header>

          <section className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14 max-w-3xl">
            <div className="rounded-2xl border border-border bg-secondary/30 p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-5 w-5 text-primary" />
                <span className="overline text-primary">Make a contribution</span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
                Every contribution keeps the platform open.
              </h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Your support covers hosting, reporting, and tools — and keeps the
                news free to read for everyone. No amount is too small.
              </p>

              {external ? (
                <a
                  href={BRAND.supportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 h-12 rounded-xl px-6 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all press"
                >
                  <HandCoins className="h-5 w-5" />
                  Donate now
                </a>
              ) : upi ? (
                <button
                  onClick={handleUpiCopy}
                  className="mt-5 inline-flex items-center gap-2 h-12 rounded-xl px-6 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all press"
                >
                  <Copy className="h-5 w-5" />
                  {copied ? "Copied!" : `Donate via UPI — ${upi}`}
                </button>
              ) : (
                <a
                  href={`mailto:${BRAND.contactEmail}?subject=Support ${encodeURIComponent(BRAND.name)}`}
                  className="mt-5 inline-flex items-center gap-2 h-12 rounded-xl px-6 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all press"
                >
                  <Mail className="h-5 w-5" />
                  Get in touch about supporting us
                </a>
              )}

              {upi && !external && (
                <p className="mt-3 text-xs text-muted-foreground">
                  UPI ID: <span className="font-mono font-semibold text-foreground">{upi}</span> — tap to copy, then pay from any UPI app.
                </p>
              )}
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <button
                onClick={handleShare}
                className="sticker sticker-hover p-5 sm:p-6 text-left group"
              >
                <Share2 className="h-6 w-6 text-primary mb-4" />
                <h2 className="font-display text-lg font-bold flex items-center gap-1.5">
                  Spread the word
                </h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Share a story you care about. Free reach is the most powerful support there is.
                </p>
              </button>

              <Link to="/contact" className="sticker sticker-hover p-5 sm:p-6 block group">
                <Mail className="h-6 w-6 text-primary mb-4" />
                <h2 className="font-display text-lg font-bold flex items-center gap-1.5">
                  Other ways to help
                  <AnimatedIcon animationType="arrowUpRight">
                    <ArrowUpRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </AnimatedIcon>
                </h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Report a story, correct an error, or build with us — reach out any time.
                </p>
              </Link>
            </div>

            <div className="mt-10 pt-8 border-t border-border">
              <p className="font-serif italic text-sm text-muted-foreground leading-relaxed">
                A note on independence: we never trade editorial control for funding.
                Supporters give because they believe in the mission — never to steer
                the news. Read our {""}
                <Link to="/editorial" className="text-primary hover:underline font-medium">editorial standards</Link>.
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SupportPage;
