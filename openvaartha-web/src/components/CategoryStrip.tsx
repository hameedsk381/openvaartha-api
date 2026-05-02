import React from 'react';
import { Article, Category, categoryEmojis } from '../data/mockArticles';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import FeedCard from './FeedCard';

interface CategoryStripProps {
  category: Category;
  articles: Article[];
}

const CategoryStrip = ({ category, articles }: CategoryStripProps) => {
  if (articles.length === 0) return null;

  return (
    <section className="mb-10 lg:mb-12">
      <div className="mb-5 flex items-end justify-between gap-3 border-b border-black/5 pb-3 dark:border-white/5 sm:mb-6 sm:gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xl leading-none grayscale brightness-75 dark:brightness-110">{categoryEmojis[category]}</span>
          <h2 className="text-xl font-black uppercase tracking-tight text-foreground sm:text-2xl">{category}</h2>
        </div>

        <Link 
          to={`/category/${category.toLowerCase().replace(' ', '-')}`}
          className="flex shrink-0 items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-primary transition-all hover:gap-2 sm:text-[10px]"
        >
          Explore All <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {articles.slice(0, 3).map((article) => (
          <FeedCard key={article.id} article={article} />
        ))}
      </div>
      
      {articles.length > 3 && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:gap-4 md:grid-cols-3 md:gap-5">
          {articles.slice(3, 6).map((article) => (
            <Link 
              key={article.id}
              to={`/article/${article.slug}`}
              className="group flex flex-col gap-2 rounded-3xl border-transparent p-4 glass-thin transition-all hover:border-black/5 hover:bg-black/5"
            >
              <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground dark:text-white/60">
                {article.readTime} • {new Date(article.publishedAt).toLocaleDateString()}
              </div>

              <h3 className="text-sm font-bold text-foreground/80 group-hover:text-primary transition-colors leading-snug">
                {article.title}
              </h3>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

export default CategoryStrip;
