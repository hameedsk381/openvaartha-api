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
             <div className="flex flex-col items-center justify-center pt-24 space-y-12 opacity-10">
                <Search className="h-32 w-32" />
                <p className="text-xl font-black uppercase tracking-[0.5em]">Enter Intelligence Query</p>
             </div>
           ) : results.length > 0 ? (
             <div className="space-y-16">
               <div className="flex items-end justify-between border-b border-black/5 pb-8">
                 <div className="space-y-1">
                   <h2 className="text-sm font-black uppercase tracking-[0.4em] text-foreground opacity-30">Matched Dispatches</h2>
                   <div className="text-2xl font-black text-foreground tracking-tighter">{results.length} results for "{query || selectedCategory}"</div>
                 </div>
                 <div className="flex items-center gap-4 text-[9px] font-black opacity-30 uppercase tracking-widest">
                    <Calendar className="h-3 w-3" /> 2026 Archive
                 </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                 {results.map((article) => (
                    <FeedCard key={article.id} article={article} />
                 ))}
               </div>
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center pt-24 space-y-8 text-center">
                <Hash className="h-16 w-16 text-primary opacity-10" />
                <div className="space-y-2">
                  <p className="text-xl font-black uppercase tracking-tighter">No Intelligence Matched</p>
                  <p className="text-sm font-bold text-muted-foreground opacity-60 italic">Refine terms or search by category filters.</p>
                </div>
             </div>
           )}
        </section>

        {/* Related Searches - Navigation support */}
        {results.length > 0 && (
          <section className="mt-48 pt-24 border-t border-black/5">
             <div className="space-y-8">
                <h3 className="text-sm font-black uppercase tracking-[0.4em] text-foreground opacity-30">Suggested Intelligence</h3>
                <div className="flex flex-wrap gap-4">
                  {['Andhra Budget', 'IIT Madras AI', 'Tesla Investment', 'MS Dhoni Retirement'].map(s => (
                    <button key={s} onClick={() => setQuery(s)} className="group flex items-center gap-2 px-6 py-3 bg-black/[0.02] border border-black/5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-foreground/40 hover:bg-primary/5 hover:text-primary hover:border-primary/10 transition-all">
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
