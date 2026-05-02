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
      
      <main className="mx-auto max-w-[1440px] pt-32 sm:pt-48 pb-24 px-4 sm:px-8 lg:px-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        {/* Engagement Analytics Header */}
        <header className="mb-24 flex flex-col items-center text-center space-y-8 pb-20 border-b border-black/5 relative overflow-hidden group">
           <div className="absolute inset-0 bg-primary/[0.02] opacity-50 z-0" />
           <div className="flex items-center gap-3 relative z-10 px-4 py-1.5 rounded-full glass bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.4em] shadow-glass-sm animate-float">
             <BarChart3 className="h-4 w-4" /> Real-time Analytics
           </div>
           <div className="space-y-4 relative z-10">
             <h1 className="text-5xl sm:text-8xl font-black text-foreground tracking-[-0.08em] leading-none">THE MOMENTUM</h1>
             <p className="text-[11px] font-black uppercase tracking-[0.6em] text-muted-foreground opacity-30">Engagement Loop Intelligence</p>
           </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Main Feed - Momentum List */}
          <section className="lg:col-span-8 space-y-12">
            <div className="flex items-center gap-8 border-b border-black/5 pb-8 mb-12">
               {(['24h', '7d', 'Shared'] as const).map(tab => (
                 <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "text-xs font-black uppercase tracking-[0.3em] transition-all",
                    activeTab === tab ? "text-primary scale-110" : "text-muted-foreground/30 hover:text-foreground"
                  )}
                 >
                   {tab === '24h' ? 'Trending 24h' : tab === '7d' ? 'Last 7 Days' : 'Most Shared'}
                 </button>
               ))}
            </div>

            <div className="space-y-12">
               {currentList.map((article, i) => (
                 <div key={article.id} className="flex gap-8 group">
                    <div className="text-4xl sm:text-7xl font-black text-black/5 group-hover:text-primary/10 transition-colors tabular-nums">
                       {String(i + 1).padStart(2, '0')}
                    </div>
                    <div className="flex-1 pb-12 border-b border-black/5">
                      <FeedCard article={article} variant="list" />
                    </div>
                 </div>
               ))}
            </div>
          </section>

          {/* Sidebar - Curation Logic */}
          <aside className="lg:col-span-4 space-y-16">
             <section className="p-10 bg-black/5 rounded-[3rem] border border-black/5 space-y-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity">
                   <Award className="h-16 w-16 text-primary" />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-black uppercase tracking-[0.4em] text-foreground opacity-30">Editor Picks</h3>
                  <p className="text-xs font-bold text-muted-foreground opacity-40 leading-relaxed italic uppercase tracking-widest">Selected for Depth</p>
                </div>
                <div className="grid gap-8">
                   {editorPicks.map(a => (
                     <Link key={a.id} to={`/article/${a.slug}`} className="group/item flex flex-col gap-2">
                        <div className="text-[9px] font-black uppercase tracking-widest text-primary/50 group-hover/item:text-primary transition-colors">{a.category}</div>
                        <h4 className="text-base font-black text-foreground/80 group-hover/item:text-primary transition-colors leading-tight tracking-tight">{a.title}</h4>
                     </Link>
                   ))}
                </div>
             </section>

             <section className="p-10 rounded-[3rem] border-2 border-primary/5 border-dashed space-y-6">
                <h3 className="text-sm font-black uppercase tracking-[0.4em] text-primary/40">Engagement Logic</h3>
                <p className="text-xs font-bold text-muted-foreground leading-relaxed opacity-60">
                   Trending intelligence is calculated using a combination of CTR, average read-time, and social distribution across Threads and WhatsApp groups.
                </p>
                <div className="h-1 w-12 bg-primary/20" />
             </section>
          </aside>
        </div>

      </main>
    </div>
  );
};

export default TrendingPage;
