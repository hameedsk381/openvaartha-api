import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { articles, Category, categoryEmojis } from '../data/mockArticles';
import Navbar from '../components/Navbar';
import CategoryChips from '../components/CategoryChips';
import FeedCard from '../components/FeedCard';
import { Filter, TrendingUp, Sparkles, LayoutGrid, List } from 'lucide-react';
import { Button } from '../components/ui/button';
import { getArticleImage, handleImageFallback } from '../lib/utils';

const CategoryPage = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [filter, setFilter] = useState<'Latest' | 'Popular' | 'Explained'>('Latest');
  
  // Convert slug back to Category type
  const currentCategory = articles.find(a => 
    a.category.toLowerCase().replace(' ', '-') === categoryId
  )?.category || 'Politics' as Category;

  const categoryArticles = articles.filter(a => a.category === currentCategory);
  const featured = categoryArticles.find(a => a.trending) || categoryArticles[0];
  const others = categoryArticles.filter(a => a.id !== featured.id);

  const formatHeader = (cat: string) => cat.toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <CategoryChips selected={currentCategory} onSelect={() => {}} />
      
      <main className="mx-auto max-w-[1440px] px-4 pt-16 pb-20 sm:px-8 sm:pt-24 sm:pb-24 lg:px-16 animate-in fade-in duration-1000">
        
        {/* Category Header */}
        <header className="mb-12 flex flex-col gap-6 border-b border-black/5 pb-10 sm:mb-16 sm:pb-12">
          <div className="flex items-center gap-4">
            <span className="text-4xl leading-none grayscale brightness-50">{categoryEmojis[currentCategory]}</span>
            <div className="space-y-1">
              <h1 className="text-5xl font-black leading-none tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
                {formatHeader(currentCategory)}
              </h1>
              <p className="text-[11px] font-black uppercase tracking-[0.5em] text-muted-foreground opacity-30">Vertical Dossiers & Intelligence</p>
            </div>
          </div>
          
          <p className="max-w-2xl text-lg font-bold leading-relaxed text-muted-foreground italic sm:text-xl">
            Authoritative reporting on {currentCategory.toLowerCase()} across South India’s major corridors. Zero-fluff dispatches.
          </p>
        </header>

        {/* Featured Story - Mini Homepage Style */}
        <section className="mb-16 sm:mb-20 lg:mb-24">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="aspect-[16/9] overflow-hidden rounded-[2rem] border border-black/5 shadow-glass-lg sm:rounded-[3rem] lg:col-span-7 group">
              <img 
                src={getArticleImage(featured.thumbnail)} 
                alt={featured.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-1000 grayscale brightness-90 group-hover:grayscale-0"
                onError={handleImageFallback}
              />
            </div>
            <div className="space-y-6 lg:col-span-5 lg:space-y-8">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass bg-primary/10 text-primary text-[9px] font-black uppercase tracking-[0.3em]">
                <Sparkles className="h-3.5 w-3.5" />
                Featured Dispatch
              </div>
              <h2 className="text-3xl font-black leading-[1.02] tracking-tighter text-foreground sm:text-4xl lg:text-5xl lg:leading-[0.95]">
                {featured.title}
              </h2>
              <p className="text-base font-bold leading-relaxed text-muted-foreground sm:text-lg">
                {featured.summary}
              </p>
              <Link to={`/article/${featured.slug}`}>
                <Button className="h-11 rounded-xl bg-primary px-8 text-[11px] font-black uppercase tracking-widest text-white shadow-glass transition-all hover:scale-[1.02] active:scale-95 sm:h-12 sm:px-10">
                  Read Analysis
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Filters & Latest Feed */}
        <section className="space-y-8 sm:space-y-10 lg:space-y-12">
          <div className="flex flex-col justify-between gap-5 border-b border-black/5 pb-6 sm:flex-row sm:items-center sm:gap-6 sm:pb-8">
            <div className="flex items-center gap-6">
              {(['Latest', 'Popular', 'Explained'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFilter(opt)}
                  className={`text-[10px] font-black uppercase tracking-widest transition-all ${
                    filter === opt ? 'text-primary scale-110' : 'text-muted-foreground opacity-40 hover:opacity-100'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-4 text-[9px] font-black opacity-30 uppercase tracking-widest">
              <TrendingUp className="h-3 w-3" />
              {categoryArticles.length} Briefings Tracked
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3 lg:gap-12">
            {others.map((article) => (
              <FeedCard key={article.id} article={article} />
            ))}
          </div>
        </section>

        {/* Subtopics Backbone - Informational density */}
        <section className="mt-20 border-t border-black/5 pt-12 sm:mt-32 sm:pt-16 lg:mt-48 lg:pt-24">
           <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10 lg:gap-16">
              <div className="space-y-6">
                <h3 className="text-sm font-black uppercase tracking-[0.4em] text-foreground opacity-30">Subtopics</h3>
                <div className="flex flex-wrap gap-2">
                  {['AI', 'Startups', 'Semiconductors', 'Policy'].map(t => (
                    <span key={t} className="px-4 py-2 bg-black/5 rounded-full text-[10px] font-black uppercase tracking-widest text-foreground/40 border border-black/5">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="rounded-[2rem] border border-black/5 bg-black/[0.02] p-6 sm:p-8 md:col-span-2 lg:rounded-[3rem] lg:p-12">
                 <h3 className="text-xl font-black text-foreground tracking-tighter uppercase mb-6">Expertise Desk</h3>
                 <p className="text-sm font-bold text-muted-foreground leading-relaxed max-w-xl opacity-60">
                   Our {currentCategory.toLowerCase()} desk covers the intersection of regional policy and global shifts. Every dispatch is vetted by regional experts to ensure zero noise.
                 </p>
              </div>
           </div>
        </section>

      </main>
    </div>
  );
};

export default CategoryPage;
