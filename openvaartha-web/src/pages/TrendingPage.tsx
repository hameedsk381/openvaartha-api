import React, { useState } from 'react';
import { articles, Article } from '../data/mockArticles';
import Navbar from '../components/Navbar';
import FeedCard from '../components/FeedCard';
import { TrendingUp, BarChart3, Share2, Award, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const TrendingPage = () => {
  const [activeTab, setActiveTab] = useState<'24h' | '7d' | 'Shared'>('24h');
  
  const trending = articles.filter(a => a.trending);
  const shared = articles.slice(2, 5);
  const editorPicks = articles.slice(5, 8);

  const currentList = activeTab === 'Shared' ? shared : trending;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      
      <main className="mx-auto max-w-[1440px] pt-20 sm:pt-28 pb-24 px-4 sm:px-8 lg:px-16 animate-in fade-in duration-700">

        {/* Header */}
        <header className="mb-10 sm:mb-16 flex flex-col items-center text-center space-y-4 pb-8 sm:pb-12 border-b border-black/5 relative overflow-hidden">
           <div className="absolute inset-0 bg-primary/[0.02] opacity-50 z-0" />
           <div className="flex items-center gap-2 relative z-10 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
             <BarChart3 className="h-3.5 w-3.5" /> Real-time
           </div>
           <div className="space-y-3 relative z-10">
             <h1 className="text-4xl sm:text-6xl font-bold text-foreground tracking-tight leading-tight">Trending</h1>
             <p className="text-sm text-muted-foreground">Most-read stories right now</p>
           </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Main Feed */}
          <section className="lg:col-span-8 space-y-6">
            <div className="flex items-center gap-1 border-b border-black/5 pb-4">
               {(['24h', '7d', 'Shared'] as const).map(tab => (
                 <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "h-10 px-4 rounded-lg text-sm font-medium transition-colors",
                    activeTab === tab ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
                  )}
                 >
                   {tab === '24h' ? 'Today' : tab === '7d' ? 'This week' : 'Most shared'}
                 </button>
               ))}
            </div>

            <div className="space-y-6">
               {currentList.map((article, i) => (
                 <div key={article.id} className="flex gap-4 group">
                    <div className="text-2xl font-bold text-black/10 group-hover:text-primary/20 transition-colors tabular-nums shrink-0 w-8 pt-1">
                       {i + 1}
                    </div>
                    <div className="flex-1 pb-6 border-b border-black/5">
                      <FeedCard article={article} variant="list" />
                    </div>
                 </div>
               ))}
            </div>
          </section>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
             <section className="p-5 sm:p-6 bg-muted/40 rounded-2xl border border-border space-y-5">
                <h3 className="text-sm font-semibold text-foreground">Editor picks</h3>
                <div className="space-y-5">
                   {editorPicks.map(a => (
                     <Link key={a.id} to={`/article/${a.slug}`} className="group/item flex flex-col gap-1.5">
                        <span className="text-xs text-primary font-medium">{a.category}</span>
                        <h4 className="text-sm font-semibold text-foreground group-hover/item:text-primary transition-colors leading-snug">{a.title}</h4>
                     </Link>
                   ))}
                </div>
             </section>

             <section className="p-5 sm:p-6 rounded-2xl border border-border space-y-3">
                <h3 className="text-sm font-semibold text-foreground">How this works</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                   Trending stories are ranked by read time, click rate, and WhatsApp shares over the selected window.
                </p>
             </section>
          </aside>
        </div>

      </main>
    </div>
  );
};

export default TrendingPage;
