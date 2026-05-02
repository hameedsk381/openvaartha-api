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
          <div className="space-y-1">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {formatHeader(currentCategory)}
            </h1>
            <p className="text-sm text-muted-foreground">Latest in {currentCategory.toLowerCase()}</p>
          </div>

          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Reporting on {currentCategory.toLowerCase()} across South India.
          </p>
        </header>

        {/* Featured Story */}
        <section className="mb-16 sm:mb-20 lg:mb-24">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="aspect-[16/9] overflow-hidden rounded-2xl border border-black/5 lg:col-span-7 group">
              <img
                src={getArticleImage(featured.thumbnail)}
                alt={featured.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                onError={handleImageFallback}
              />
            </div>
            <div className="space-y-5 lg:col-span-5 lg:space-y-6">
               <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                Featured
              </div>
              <h2 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                {featured.title}
              </h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                {featured.summary}
              </p>
              <Link to={`/article/${featured.slug}`}>
                <Button className="h-11 rounded-lg bg-primary px-6 text-sm font-semibold text-white transition-all hover:bg-primary/90 active:scale-95">
                  Read article
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Filters & Latest Feed */}
        <section className="space-y-8 sm:space-y-10 lg:space-y-12">
          <div className="flex flex-col justify-between gap-5 border-b border-black/5 pb-6 sm:flex-row sm:items-center sm:gap-6 sm:pb-8">
            <div className="flex items-center gap-1">
              {(['Latest', 'Popular', 'Explained'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFilter(opt)}
                  className={`h-9 px-4 rounded-lg text-sm font-medium transition-colors ${
                    filter === opt ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              {categoryArticles.length} articles
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3 lg:gap-12">
            {others.map((article) => (
              <FeedCard key={article.id} article={article} />
            ))}
          </div>
        </section>

        {/* Subtopics */}
        <section className="mt-16 border-t border-black/5 pt-10 sm:mt-20">
           <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Subtopics</h3>
                <div className="flex flex-wrap gap-2">
                  {['AI', 'Startups', 'Semiconductors', 'Policy'].map(t => (
                    <span key={t} className="h-8 px-3 flex items-center bg-muted rounded-full text-xs font-medium text-foreground/60 border border-black/5">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-black/[0.02] p-5 sm:p-6 md:col-span-2">
                 <h3 className="text-base font-semibold text-foreground mb-3">{currentCategory} desk</h3>
                 <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                   Our {currentCategory.toLowerCase()} team covers regional policy and global shifts. Every story is verified by regional reporters.
                 </p>
              </div>
           </div>
        </section>

      </main>
    </div>
  );
};

export default CategoryPage;
