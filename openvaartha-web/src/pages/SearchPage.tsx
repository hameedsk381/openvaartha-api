import React, { useState, useMemo } from 'react';
import { articles, Category } from '../data/mockArticles';
import Navbar from '../components/Navbar';
import FeedCard from '../components/FeedCard';
import { Search, Filter, Calendar, X, Hash } from 'lucide-react';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  
  const results = useMemo(() => {
    if (!query && selectedCategory === 'All') return [];
    return articles.filter(a => {
      const matchQuery = a.title.toLowerCase().includes(query.toLowerCase()) || 
                          a.content.body.toLowerCase().includes(query.toLowerCase());
      const matchCategory = selectedCategory === 'All' || a.category === selectedCategory;
      return matchQuery && matchCategory;
    });
  }, [query, selectedCategory]);

  const categories: (Category | 'All')[] = ["All", "Politics", "Tech", "Business", "Cinema", "Local News", "Sports"];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      
      <main className="mx-auto max-w-[1440px] pt-20 sm:pt-28 pb-24 px-4 sm:px-8 lg:px-16 animate-in fade-in duration-700">

        {/* Search interface */}
        <section className="mb-10 sm:mb-16 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search articles and topics…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-12 text-base text-foreground placeholder:text-muted-foreground bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1 pr-1">
              <Filter className="h-3 w-3" />
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 h-9 px-4 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat ? 'bg-primary text-white' : 'bg-muted text-foreground/70 hover:bg-muted/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Results Interface */}
        <section className="min-h-[400px]">
           {!query && selectedCategory === 'All' ? (
             <div className="flex flex-col items-center justify-center pt-24 space-y-6 opacity-30">
                <Search className="h-16 w-16" />
                <p className="text-base text-muted-foreground">Search articles, topics, or categories</p>
             </div>
           ) : results.length > 0 ? (
             <div className="space-y-12">
               <div className="flex items-end justify-between border-b border-black/5 pb-6">
                 <div className="space-y-1">
                   <h2 className="text-sm font-medium text-muted-foreground">Results</h2>
                   <div className="text-xl font-bold text-foreground tracking-tight">{results.length} results for "{query || selectedCategory}"</div>
                 </div>
                 <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" /> Archive
                 </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                 {results.map((article) => (
                    <FeedCard key={article.id} article={article} />
                 ))}
               </div>
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center pt-24 space-y-4 text-center">
                <Hash className="h-12 w-12 text-primary opacity-30" />
                <div className="space-y-1">
                  <p className="text-base font-semibold">No results found</p>
                  <p className="text-sm text-muted-foreground">Try different keywords or filters.</p>
                </div>
             </div>
           )}
        </section>

        {/* Suggested searches */}
        {results.length > 0 && (
          <section className="mt-32 pt-16 border-t border-black/5">
             <div className="space-y-6">
                <h3 className="text-sm font-semibold text-foreground">Suggested searches</h3>
                <div className="flex flex-wrap gap-2">
                  {['Andhra Budget', 'IIT Madras AI', 'Tesla Investment', 'MS Dhoni Retirement'].map(s => (
                    <button key={s} onClick={() => setQuery(s)} className="group flex items-center gap-2 h-10 px-4 bg-muted rounded-full text-sm font-medium text-foreground/70 hover:bg-primary/10 hover:text-primary transition-colors">
                      {s} <Search className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
             </div>
          </section>
        )}

      </main>
    </div>
  );
};

export default SearchPage;
