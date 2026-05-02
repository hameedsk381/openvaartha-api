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
      
      <main className="mx-auto max-w-[1440px] pt-24 sm:pt-40 pb-24 px-4 sm:px-8 lg:px-16 animate-in fade-in duration-700">
        
        {/* Search Engine Interface */}
        <section className="mb-24 space-y-12">
          <div className="relative group">
            <Search className="absolute left-10 top-1/2 -translate-y-1/2 h-8 w-8 text-primary opacity-30 group-focus-within:opacity-100 transition-opacity" />
            <input 
              type="text" 
              placeholder="SEARCH DISPATCHES & INTELLIGENCE..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-24 pl-24 pr-12 text-3xl font-black text-foreground placeholder:text-black/5 bg-black/[0.02] border-b-2 border-black/5 focus:border-primary outline-none transition-all uppercase tracking-tighter"
              autoFocus
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="absolute right-10 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-all"
              >
                <X className="h-5 w-5 opacity-40" />
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30 mr-4">
               <Filter className="h-3 w-3" /> Filters
            </div>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  selectedCategory === cat ? 'bg-primary text-white shadow-glass' : 'bg-black/5 text-foreground/40 hover:bg-black/10'
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

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
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
                    <button key={s} onClick={() => setQuery(s)} className="group flex items-center gap-2 px-4 py-2 bg-black/5 border border-black/5 rounded-full text-xs font-medium text-foreground/70 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors">
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
