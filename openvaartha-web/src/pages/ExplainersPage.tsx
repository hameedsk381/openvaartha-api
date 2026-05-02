import React from 'react';
import { articles, Article } from '../data/mockArticles';
import Navbar from '../components/Navbar';
import FeedCard from '../components/FeedCard';
import { Info, HelpCircle, ArrowRight, Zap, Target, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getArticleImage, handleImageFallback } from '../lib/utils';

const ExplainersPage = () => {
  const explainers = articles.slice(0, 5); // Mock explainers

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/5">
      <Navbar />
      
      <main className="mx-auto max-w-[1440px] px-4 pt-28 pb-20 sm:px-8 sm:pt-36 sm:pb-24 lg:px-16 lg:pt-48 animate-in fade-in duration-1000">
        
        {/* Explainer Backbone Header */}
        <header className="relative mb-16 flex flex-col items-center space-y-8 overflow-hidden border-b border-black/5 pb-14 text-center sm:mb-24 sm:space-y-10 sm:pb-20 lg:mb-32 lg:space-y-12 lg:pb-24 group">
           <div className="flex items-center gap-3 relative z-10 px-4 py-1.5 rounded-full glass bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.4em]">
             <HelpCircle className="h-4 w-4" /> Intellectual Infrastructure
           </div>
           <div className="space-y-6 relative z-10">
             <h1 className="text-5xl font-black uppercase leading-none tracking-[-0.08em] text-foreground sm:text-7xl lg:text-9xl lg:tracking-[-0.1em]">THE DEEP DIVE</h1>
             <p className="mx-auto max-w-xl text-base font-bold leading-relaxed text-muted-foreground italic opacity-80 sm:text-lg lg:text-xl">
               Complexity simplified. We break down the regional shifts you need to understand—beyond the headlines.
             </p>
           </div>
        </header>

        {/* Structured Formatting Section */}
        <section className="mb-20 grid grid-cols-1 gap-8 lg:mb-48 lg:grid-cols-2 lg:gap-16">
          {explainers.slice(0, 2).map((article) => (
             <div key={article.id} className="rounded-[2rem] border border-black/5 bg-black/[0.02] p-6 transition-all hover:-translate-y-2 sm:rounded-[3rem] sm:p-10 lg:rounded-[4rem] lg:p-20 group">
                <div className="space-y-8 lg:space-y-12">
                   <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary opacity-40">{article.category}</span>
                      <div className="h-1 w-12 bg-primary/20" />
                   </div>
                   <h2 className="text-3xl font-black leading-[1.04] tracking-tighter text-foreground transition-colors group-hover:text-primary sm:text-4xl lg:leading-none">
                      {article.title}
                   </h2>
                   
                   <div className="space-y-7 border-t border-black/5 pt-7 lg:space-y-10 lg:pt-10">
                      <div className="space-y-4">
                         <div className="flex items-center gap-2.5 text-[11px] font-black uppercase tracking-[0.3em] text-primary/60">
                            <Zap className="h-4 w-4" /> What Happened
                         </div>
                         <p className="text-base font-bold leading-snug text-muted-foreground/80 sm:text-lg">{article.summary}</p>
                      </div>
                      
                      <div className="space-y-4">
                         <div className="flex items-center gap-2.5 text-[11px] font-black uppercase tracking-[0.3em] text-primary/60">
                            <Target className="h-4 w-4" /> Why It Matters
                         </div>
                         <p className="text-base font-bold leading-snug text-muted-foreground/80 sm:text-lg">{article.content.tldr}</p>
                      </div>
                   </div>
                   
                   <Link to={`/article/${article.slug}`} className="group/item flex items-center gap-4 text-xs font-black uppercase tracking-widest text-primary hover:gap-6 transition-all">
                      Read Full Explainer <ArrowRight className="h-4 w-4" />
                   </Link>
                </div>
             </div>
          ))}
        </section>

        {/* Simplified Breakdowns - Scannable List */}
        <section className="space-y-8 sm:space-y-12 lg:space-y-16">
          <div className="flex items-center gap-4 sm:gap-6">
            <h3 className="text-sm font-black uppercase tracking-[0.4em] text-foreground opacity-30">Archive of Complex Topics</h3>
            <div className="h-px flex-1 bg-black/5" />
          </div>
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10 lg:grid-cols-3 lg:gap-16">
            {articles.slice(5).map((article) => (
              <div key={article.id} className="space-y-6 group">
                 <div className="h-48 rounded-[2rem] bg-black/5 border border-black/5 overflow-hidden group-hover:shadow-glass-lg transition-all">
                    <img
                      src={getArticleImage(article.thumbnail)}
                      className="w-full h-full object-cover grayscale brightness-50 group-hover:grayscale-0 transition-all duration-700"
                      alt={article.title}
                      onError={handleImageFallback}
                    />
                 </div>
                 <div className="space-y-3">
                   <div className="text-[9px] font-black uppercase tracking-widest text-primary opacity-40">{article.category}</div>
                   <h3 className="text-xl font-black text-foreground/80 group-hover:text-primary transition-colors leading-tight tracking-tight">
                     {article.title}
                   </h3>
                 </div>
                 <Link to={`/article/${article.slug}`} className="inline-flex items-center h-10 px-6 bg-black/5 hover:bg-primary hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                    Load Explainer
                 </Link>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
};

export default ExplainersPage;
