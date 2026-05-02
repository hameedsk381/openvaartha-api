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
      
      <main className="mx-auto max-w-[1440px] px-4 pt-20 pb-24 sm:px-8 sm:pt-28 lg:px-16 animate-in fade-in duration-700">

        {/* Header */}
        <header className="mb-10 sm:mb-16 flex flex-col items-center text-center space-y-4 pb-8 sm:pb-12 border-b border-black/5">
           <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
             <HelpCircle className="h-3.5 w-3.5" /> Deep dives
           </div>
           <div className="space-y-3">
             <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight leading-tight">Explainers</h1>
             <p className="text-sm text-muted-foreground max-w-md mx-auto">
               Complexity simplified. Regional shifts and context, beyond the headlines.
             </p>
           </div>
        </header>

        {/* Featured explainers */}
        <section className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {explainers.slice(0, 2).map((article) => (
             <div key={article.id} className="rounded-2xl border border-black/5 bg-black/[0.02] p-5 sm:p-6 transition-colors hover:bg-black/[0.04] group">
                <div className="space-y-5">
                   <span className="text-xs font-medium text-primary">{article.category}</span>
                   <h2 className="text-xl sm:text-2xl font-bold leading-snug text-foreground transition-colors group-hover:text-primary tracking-tight">
                      {article.title}
                   </h2>

                   <div className="space-y-4 border-t border-black/5 pt-4">
                      <div className="space-y-2">
                         <div className="flex items-center gap-2 text-xs font-semibold text-primary/60">
                            <Zap className="h-3.5 w-3.5" /> What happened
                         </div>
                         <p className="text-sm leading-relaxed text-muted-foreground">{article.summary}</p>
                      </div>

                      <div className="space-y-2">
                         <div className="flex items-center gap-2 text-xs font-semibold text-primary/60">
                            <Target className="h-3.5 w-3.5" /> Why it matters
                         </div>
                         <p className="text-sm leading-relaxed text-muted-foreground">{article.content.tldr}</p>
                      </div>
                   </div>

                   <Link to={`/article/${article.slug}`} className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:gap-3 transition-all">
                      Read full explainer <ArrowRight className="h-3.5 w-3.5" />
                   </Link>
                </div>
             </div>
          ))}
        </section>

        {/* More explainers */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-semibold text-foreground">More explainers</h3>
            <div className="h-px flex-1 bg-black/5" />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.slice(5).map((article) => (
              <div key={article.id} className="space-y-3 group">
                 <div className="aspect-video rounded-xl overflow-hidden bg-black/5 border border-black/5">
                    <img
                      src={getArticleImage(article.thumbnail)}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      alt={article.title}
                      onError={handleImageFallback}
                    />
                 </div>
                 <div className="space-y-1.5">
                   <span className="text-xs font-medium text-primary">{article.category}</span>
                   <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug tracking-tight">
                     {article.title}
                   </h3>
                 </div>
                 <Link to={`/article/${article.slug}`} className="inline-flex items-center h-9 px-4 bg-muted hover:bg-primary hover:text-white rounded-lg text-xs font-semibold transition-all">
                    Read explainer
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
