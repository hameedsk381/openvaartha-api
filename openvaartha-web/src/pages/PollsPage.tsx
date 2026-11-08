import Navbar from '../components/Navbar';
import { InteractivePoll } from '@/components/InteractivePoll';
import { usePolls } from '@/lib/api-hooks';
import { BarChart3 } from 'lucide-react';

/**
 * Polls Hub: every active reader poll in one place, instead of only
 * surfacing inside whichever article happened to embed it. Reuses
 * InteractivePoll (same component embedded in ArticlePage) so voting
 * behaves identically everywhere.
 */
const PollsPage = () => {
  const { data: polls = [], isLoading } = usePolls(true);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-20 sm:pt-24 pb-16">
        <div className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-10">
          <header className="py-10 sm:py-14 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="overline text-primary">Reader voice · Live issues</span>
            </div>
            <h1 className="poster text-4xl sm:text-6xl font-bold tracking-tight leading-[1.02]">
              Polls
            </h1>
            <p className="font-serif italic text-base sm:text-lg text-muted-foreground mt-4 max-w-2xl leading-relaxed">
              Where readers weigh in on the issues we're covering — every active poll, in one place.
            </p>
          </header>

          <div className="py-10 sm:py-14">
            {isLoading ? (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="w-full h-48 rounded-xl border border-border bg-[hsl(var(--surface))] animate-pulse" />
                ))}
              </div>
            ) : polls.length === 0 ? (
              <div className="py-16 text-center">
                <BarChart3 className="h-8 w-8 text-primary/40 mx-auto mb-3" />
                <p className="font-serif italic text-muted-foreground">
                  No active polls right now. Check back as we cover the next big issue.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {polls.map((poll) => (
                  <InteractivePoll key={poll.id} pollId={poll.id} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PollsPage;
