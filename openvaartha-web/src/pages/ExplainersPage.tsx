import { useState } from 'react';
import Navbar from '../components/Navbar';
import { ArrowUpRight, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { handleImageFallback } from '../lib/utils';
import { useExplainers } from '@/lib/api-hooks';
import { ExplainersPageSkeleton } from '@/components/PageSkeletons';
import { FlipCard } from '@/components/animate-ui/components/community/flip-card';
import { AnimatedIcon } from '@/components/ui/animated-icon';
import { Compass } from '@/components/animate-ui/icons/compass';
import { Clock } from '@/components/animate-ui/icons/clock';
import { LoaderCircle } from '@/components/animate-ui/icons/loader-circle';

import { TabGroup, TabList, Tab } from '@/components/animate-ui/components/headless/tabs';

const MotionLink = motion.create(Link);

const relativeTime = (iso: string) => {
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 24) return `${Math.max(h, 1)}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const ExplainersPage = () => {
  const [limit, setLimit] = useState(12);
  const { data: explainers = [], isFetching, isLoading } = useExplainers(0, limit);
  const [selectedCategory, setSelectedCategory] = useState('All');

  if (isLoading && explainers.length === 0) {
    return <ExplainersPageSkeleton />;
  }

  // Extract categories dynamically
  const categories = ['All', ...Array.from(new Set(explainers.map(e => e.category)))];

  const filteredExplainers = selectedCategory === 'All'
    ? explainers
    : explainers.filter(e => e.category.toLowerCase() === selectedCategory.toLowerCase());

  const lead = filteredExplainers[0];
  const featured = filteredExplainers.slice(1, 3);
  const more = filteredExplainers.slice(3);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-20 sm:pt-24 pb-16">
        <div className="max-w-screen-2xl mx-auto">
          <header className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14 border-b border-border bg-[hsl(var(--surface))]">
            <div className="flex items-center gap-2 mb-3">
              <Compass className="h-4 w-4 text-primary" />
              <span className="overline text-primary">Deep dives · Context</span>
            </div>
            <h1 className="poster text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02]">
              Explainers
            </h1>
            <p className="font-serif italic text-base sm:text-lg text-muted-foreground mt-4 max-w-2xl leading-relaxed">
              The "why" behind the headline. Long-form context on the ideas, people and shifts shaping the internet you live in.
            </p>
          </header>

          {categories.length > 2 && (
            <div className="px-4 sm:px-6 lg:px-10 py-6 border-b border-border bg-background">
              <TabGroup onChange={(index) => setSelectedCategory(categories[index])}>
                <TabList>
                  {categories.map((cat, idx) => (
                    <Tab key={cat} index={idx}>
                      {cat}
                    </Tab>
                  ))}
                </TabList>
              </TabGroup>
            </div>
          )}

          {lead && (
            <section className="border-b border-border">
              <MotionLink
                to={`/article/${lead.slug}`}
                className="group press block"
                initial="initial"
                whileHover="hover"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12">
                  {lead.thumbnailUrl && (
                    <div className="lg:col-span-7 aspect-[16/10] sm:aspect-[16/9] lg:aspect-auto overflow-hidden bg-[hsl(var(--surface-2))]">
                      <img
                        src={lead.thumbnailUrl}
                        alt={lead.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        onError={handleImageFallback}
                      />
                    </div>
                  )}
                  <div className="lg:col-span-5 lg:border-l lg:border-border p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="overline text-primary">The deep dive</span>
                      <span className="h-1 w-1 rounded-full bg-border" />
                      <span className="text-[11px] text-muted-foreground font-medium">{relativeTime(lead.publishedAt)}</span>
                    </div>
                    <h2 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-bold leading-[1.05] tracking-tight group-hover:text-primary transition-colors">
                      {lead.title}
                    </h2>
                    <p className="font-serif text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed line-clamp-4">
                      {lead.content?.tldr || lead.summary}
                    </p>
                    <div className="mt-6 flex items-center gap-4 text-[11px] text-muted-foreground font-medium">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {lead.readTime} read</span>
                      <span>·</span>
                      <span className="truncate">{lead.author}</span>
                    </div>
                    <span className="mt-7 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary group-hover:underline underline-offset-4 self-start">
                      Read the explainer
                      <AnimatedIcon animationType="arrowUpRight">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </AnimatedIcon>
                    </span>
                  </div>
                </div>
              </MotionLink>
            </section>
          )}

          {featured.length > 0 && (
            <section className="border-b border-border px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
              <div className="flex items-baseline justify-between mb-8 pb-5 border-b border-border">
                <div>
                  <span className="overline text-primary">In focus</span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight mt-1">
                    Two big questions
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                {featured.map((art) => (
                  <MotionLink
                    key={art.id}
                    to={`/article/${art.slug}`}
                    className="group press block bg-[hsl(var(--surface))] rounded-lg border border-border p-6 sm:p-8 hover:border-primary/40 transition-colors"
                    initial="initial"
                    whileHover="hover"
                  >
                    <span className="overline text-primary">{art.category}</span>
                    <h2 className="font-serif text-xl sm:text-2xl font-bold leading-snug tracking-tight mt-3 group-hover:text-primary transition-colors">
                      {art.title}
                    </h2>

                    <div className="mt-6 space-y-5">
                      <div>
                        <p className="overline text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Target className="h-3 w-3" /> What happened
                        </p>
                        <p className="font-serif text-sm sm:text-base text-foreground/80 leading-relaxed">
                          {art.summary}
                        </p>
                      </div>
                      <div>
                        <p className="overline text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Compass className="h-3 w-3" /> Why it matters
                        </p>
                        <p className="font-serif text-sm sm:text-base text-foreground/80 leading-relaxed">
                          {art.content?.tldr || art.summary}
                        </p>
                      </div>
                    </div>

                    <span className="mt-7 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary group-hover:underline underline-offset-4">
                      Read the full explainer
                      <AnimatedIcon animationType="arrowUpRight">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </AnimatedIcon>
                    </span>
                  </MotionLink>
                ))}
              </div>
            </section>
          )}

          <section className="px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
            <div className="flex items-baseline justify-between mb-8 pb-5 border-b border-border">
              <div>
                <span className="overline text-primary">Library</span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight mt-1">
                  More explainers
                </h3>
              </div>
              <span className="font-serif italic text-sm text-muted-foreground">{more.length} pieces</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
              {more.map((art) => (
                <FlipCard
                  key={art.id}
                  className="w-full h-full min-h-[300px]"
                  frontContent={
                    <div className="w-full h-full flex flex-col p-4 bg-[hsl(var(--surface-2))] border border-border rounded-lg group">
                      {art.thumbnailUrl && (
                        <div className="aspect-[4/3] overflow-hidden rounded-lg mb-4 w-full">
                          <img
                            src={art.thumbnailUrl}
                            alt={art.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                            onError={handleImageFallback}
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="overline text-primary">{art.category}</span>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span className="text-[10px] text-muted-foreground font-medium">{art.readTime}</span>
                      </div>
                      <h3 className="font-serif text-lg font-bold leading-snug tracking-tight group-hover:text-primary transition-colors line-clamp-3">
                        {art.title}
                      </h3>
                    </div>
                  }
                  backContent={
                    <MotionLink
                      to={`/article/${art.slug}`}
                      className="w-full h-full flex flex-col justify-center p-6 bg-[hsl(var(--surface))] border border-border rounded-lg group hover:border-primary/50 transition-colors"
                      initial="initial"
                      whileHover="hover"
                    >
                      <Compass className="h-6 w-6 text-primary mb-4 opacity-70" />
                      <h4 className="font-serif font-bold text-lg mb-2">TL;DR</h4>
                      <p className="font-serif text-sm text-muted-foreground line-clamp-6 leading-relaxed mb-6">
                        {art.content?.tldr || art.summary}
                      </p>
                      <span className="mt-auto inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary group-hover:underline underline-offset-4">
                        Read explainer
                        <AnimatedIcon animationType="arrowUpRight">
                          <ArrowUpRight className="h-3 w-3" />
                        </AnimatedIcon>
                      </span>
                    </MotionLink>
                  }
                />
              ))}
            </div>

            {/* Load More Button */}
            {explainers.length >= limit && (
              <div className="flex justify-center mt-12 p-6 border-t border-border">
                <button
                  onClick={() => setLimit(prev => prev + 12)}
                  disabled={isFetching}
                  className="w-full max-w-xs h-11 rounded-md border border-border bg-background text-foreground text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-[hsl(var(--surface))] transition-colors press disabled:opacity-50"
                >
                  {isFetching ? (
                    <LoaderCircle className="h-4 w-4 text-muted-foreground" animate />
                  ) : (
                    "Load more stories"
                  )}
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default ExplainersPage;
