import Navbar from '../components/Navbar';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Unlock, Users, Code2 } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { Accordion, AccordionItem, AccordionButton, AccordionPanel } from '@/components/animate-ui/components/headless/accordion';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-20 sm:pt-24 pb-16">
        <div className="max-w-screen-2xl mx-auto">
          <header className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14 border-b border-border bg-[hsl(var(--surface))]">
            <span className="overline text-primary">Who we are</span>
            <h1 className="poster text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02] mt-2">
              About {BRAND.name}
            </h1>
            <p className="font-serif italic text-base sm:text-lg text-muted-foreground mt-4 max-w-2xl leading-relaxed">
              {BRAND.tagline}
            </p>
          </header>

          <section className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14 max-w-3xl">
            <div className="article-body space-y-6 text-base sm:text-lg leading-relaxed">
              <p>
                {BRAND.name} is an independent, youth-led news initiative operated by Gen Z.
                We run an open news platform aimed at the liberation of digital spaces —
                journalism without paywalls, without clutter, and without gatekeepers.
              </p>
              <p>
                We believe the generation that grew up online should have a real say in how
                the internet's stories get told. So we report, curate, and publish in the
                open: our platform is open source, our articles are free to read, and our
                editorial choices answer to readers — not advertisers.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sticker-sm p-5">
                <Users className="h-5 w-5 text-primary mb-3" />
                <h2 className="font-display text-base font-bold">Youth-led</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Built and run by Gen Z, for everyone.
                </p>
              </div>
              <div className="sticker-sm p-5">
                <Unlock className="h-5 w-5 text-primary mb-3" />
                <h2 className="font-display text-base font-bold">Open access</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  No paywalls. Every story free, for every reader.
                </p>
              </div>
              <div className="sticker-sm p-5">
                <Code2 className="h-5 w-5 text-primary mb-3" />
                <h2 className="font-display text-base font-bold">Open source</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  The platform itself is free software, built in public.
                </p>
              </div>
            </div>

            <div className="mt-10 tldr-block">
              <span className="chip-primary mb-3">Supported by</span>
              <h2 className="font-display text-xl sm:text-2xl font-bold leading-snug">
                FOSS Andhra Foundation
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-2 leading-relaxed">
                {BRAND.name} is supported by the FOSS Andhra Foundation, a community
                dedicated to free and open-source software.
              </p>
              <a
                href="https://fossap.in"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary hover:underline underline-offset-4"
              >
                fossap.in <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="mt-10 pt-8 border-t border-border">
              <span className="overline text-primary">FAQ</span>
              <h2 className="font-display text-2xl font-bold mt-2 mb-6">Frequently Asked Questions</h2>
              <Accordion className="w-full border border-border rounded-lg p-2 bg-[hsl(var(--surface-2))]">
                <AccordionItem>
                  <AccordionButton className="font-semibold text-foreground hover:no-underline hover:text-primary py-3 px-4">
                    Is OpenVaartha really free?
                  </AccordionButton>
                  <AccordionPanel className="text-muted-foreground px-4 pb-4">
                    Yes, entirely. We do not have paywalls, subscriptions, or invasive advertising. Our mission is to keep digital news open and accessible to everyone.
                  </AccordionPanel>
                </AccordionItem>

                <AccordionItem>
                  <AccordionButton className="font-semibold text-foreground hover:no-underline hover:text-primary py-3 px-4">
                    Who runs the platform?
                  </AccordionButton>
                  <AccordionPanel className="text-muted-foreground px-4 pb-4">
                    We are a youth-led (Gen Z) independent news initiative. Our platform is supported by the FOSS Andhra Foundation, focusing on building sustainable open-source software and open media platforms.
                  </AccordionPanel>
                </AccordionItem>

                <AccordionItem>
                  <AccordionButton className="font-semibold text-foreground hover:no-underline hover:text-primary py-3 px-4">
                    Can I contribute or write articles?
                  </AccordionButton>
                  <AccordionPanel className="text-muted-foreground px-4 pb-4">
                    Absolutely! We are an open platform. If you want to pitch an article, request a correction, or contribute to the open-source codebase, head over to our Contact page to get in touch.
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            </div>

            <div className="mt-10 pt-8 border-t border-border">
              <p className="font-serif italic text-sm text-muted-foreground">
                Questions, corrections, or want to get involved?
              </p>
              <Link
                to="/contact"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary hover:underline underline-offset-4"
              >
                Contact us <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;
