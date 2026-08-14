import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { Clock } from '@/components/animate-ui/icons/clock';
import { LoaderCircle } from '@/components/animate-ui/icons/loader-circle';
import { toast } from 'sonner';
import { useNewsletterSubscribe } from '@/lib/api-hooks';
import type { Article } from '@/lib/types';
import FeedMini from './FeedMini';

export default function TrendingSidebar({ trending }: { trending: Article[] }) {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const subscribeMutation = useNewsletterSubscribe();

  return (
    <div className="lg:sticky lg:top-[140px]">
      {/* Trending */}
      <div className="px-4 sm:px-6 lg:px-6 py-5 border-b border-border flex items-baseline justify-between">
        <div>
          <span className="overline text-primary">Most read</span>
          <h3 className="font-display text-xl font-bold tracking-tight mt-0.5">Trending now</h3>
        </div>
        <Zap className="h-4 w-4 text-primary fill-current" />
      </div>
      <ol className="px-4 sm:px-6 lg:px-6 py-2">
        {trending.map((art, i) => (
          <li key={art.id} className="border-b border-border last:border-0 py-4">
            <Link to={`/article/${art.slug}`} className="group flex gap-4 press">
              <span className="font-display text-3xl font-bold text-primary/30 group-hover:text-primary transition-colors leading-none w-8 shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <span className="overline text-primary">{art.category}</span>
                <h4 className="font-display text-sm font-bold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-3 mt-1">
                  {art.title}
                </h4>
                <span className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground font-medium">
                  <Clock className="h-2.5 w-2.5" /> {art.readTime}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ol>

      {/* Newsletter CTA */}
      <div className="mx-4 sm:mx-6 lg:mx-6 my-6 p-6 rounded-2xl gradient-maroon text-white relative overflow-hidden border-2 border-foreground shadow-sticker min-h-[300px] flex flex-col justify-between">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,white,transparent_60%)]" />
        <div>
          <span className="relative chip">The Briefing</span>
          <h4 className="relative font-display text-2xl font-bold mt-3 leading-tight">
            The stories that matter, in your inbox by sunrise.
          </h4>
          <p className="relative text-sm text-white/80 mt-2 leading-relaxed">
            A free morning digest of the stories that matter — curated, never automated.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newsletterEmail.trim()) {
              subscribeMutation.mutate(newsletterEmail.trim(), {
                onSuccess: () => {
                  toast.success("Subscribed! Check your inbox.");
                  setNewsletterEmail('');
                },
                onError: (err) => toast.error(err.message),
              });
            }
          }}
          className="relative mt-4 flex gap-2"
        >
          <input
            type="email"
            value={newsletterEmail}
            onChange={(e) => setNewsletterEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="flex-1 h-11 px-4 rounded-md bg-white/20 text-white placeholder:text-white/60 text-sm border border-white/30 focus:outline-none focus:border-white"
          />
          <button
            type="submit"
            disabled={subscribeMutation.isPending}
            className="h-11 px-4 rounded-md bg-white text-primary text-sm font-bold inline-flex items-center gap-2 hover:bg-secondary transition-colors press disabled:opacity-50 shrink-0"
          >
            {subscribeMutation.isPending ? <><LoaderCircle className="h-4 w-4" animate /> Sending</> : 'Subscribe'}
          </button>
        </form>
      </div>

      {/* Bytes Mini */}
      <FeedMini />
    </div>
  );
}
