import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { History, Zap, Bell, Clock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { articles } from '../data/mockArticles';
import { Link } from 'react-router-dom';

const LiveUpdatesPage = () => {
  const [updates, setUpdates] = useState([
    { id: 1, time: '14:22', text: 'Regional Council votes in favor of the new tech corridor incentives; approval expected by evening.', type: 'major' },
    { id: 2, time: '14:10', text: 'Traffic congestion reported on Hebbal-Koramangala route due to minor waterlogging.', type: 'standard' },
    { id: 3, time: '13:55', text: 'Andhra Finance Minister concludes pre-budget meeting with district advisors.', type: 'standard' },
    { id: 4, time: '13:30', text: 'TCS confirms initial hiring pipeline of 5,000 engineers for the Vizag campus phase 1.', type: 'major' },
    { id: 5, time: '13:15', text: 'South Western Railway announces temporary suspension of 3 trains due to track maintenance.', type: 'standard' },
  ]);

  const eventTitle = "South India Daily Tracker";
  const eventStatus = "LIVE";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      
      <main className="mx-auto max-w-[900px] pt-32 sm:pt-48 pb-24 px-6 sm:px-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        {/* Live Event Header */}
        <header className="mb-24 flex flex-col items-center text-center space-y-10 pb-20 border-b border-black/5 relative overflow-hidden group">
           <div className="absolute inset-0 bg-primary/[0.03] opacity-30 z-0" />
           <div className="flex items-center gap-2.5 relative z-10 px-4 py-1.5 rounded-full glass bg-black text-white text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">
             <RefreshCw className="h-4 w-4 animate-spin" /> {eventStatus}
           </div>
           <div className="space-y-4 relative z-10">
             <h1 className="text-4xl sm:text-7xl font-black text-foreground tracking-[-0.06em] leading-none uppercase">THE REAL TIME FEED</h1>
             <p className="text-[11px] font-black uppercase tracking-[0.6em] text-muted-foreground opacity-30">Pulse of Regional Intelligence</p>
           </div>
        </header>

        {/* Live Timeline Engine */}
        <section className="space-y-16">
          <div className="flex items-center justify-between border-b border-black/5 pb-8 mb-12">
             <h3 className="text-sm font-black uppercase tracking-[0.3em] text-foreground opacity-30">Chronological Stream</h3>
             <div className="flex items-center gap-3 text-[10px] font-black text-primary uppercase tracking-widest">
               <Bell className="h-3.5 w-3.5 animate-bounce" /> Get Real-time Alerts
             </div>
          </div>

          <div className="space-y-12">
            {updates.map((update, i) => (
              <div key={update.id} className="relative group">
                {/* Visual Line connector */}
                {i !== updates.length - 1 && (
                  <div className="absolute top-12 left-6 w-px h-[calc(100%+3rem)] bg-black/5" />
                )}
                
                <div className="flex gap-10">
                  <div className="flex-none">
                    <div className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center border font-bold text-xs tabular-nums transition-all group-hover:scale-110 group-hover:rotate-6",
                      update.type === 'major' ? "bg-primary border-primary/5 text-white shadow-glass-sm" : "bg-black/[0.02] border-black/5 text-black/40"
                    )}>
                      {update.type === 'major' ? <Zap className="h-4 w-4 fill-white" /> : <Clock className="h-4 w-4" />}
                    </div>
                  </div>
                  
                  <div className="flex-1 pb-12">
                    <div className="space-y-3">
                       <div className="flex items-center gap-3">
                         <span className="text-sm font-black text-primary uppercase tracking-widest">{update.time} IST</span>
                         {update.type === 'major' && (
                           <div className="px-2 py-0.5 rounded bg-primary/5 text-[8px] font-black text-primary border border-primary/10 uppercase tracking-widest">Major Update</div>
                         )}
                       </div>
                       <p className={cn(
                         "text-xl sm:text-2xl font-bold tracking-tight leading-snug transition-colors",
                         update.type === 'major' ? "text-foreground" : "text-foreground/70"
                       )}>
                         {update.text}
                       </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Informational Dense Link Back */}
        <section className="mt-48 pt-24 border-t-2 border-primary/5">
           <h3 className="text-sm font-black uppercase tracking-[0.4em] text-foreground opacity-30 mb-8 px-4">Deep Dives on Related Topics</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {articles.slice(0, 2).map((a) => (
                <div key={a.id} className="p-8 rounded-[2.5rem] glass-thin border-black/5 hover:bg-black/5 transition-all">
                   <h4 className="text-xl font-black text-foreground/80 leading-tight mb-4 tracking-tight">{a.title}</h4>
                   <Link to={`/article/${a.slug}`} className="text-[10px] font-black text-primary uppercase tracking-widest group flex items-center gap-2">
                     Read Full Dispatch <span className="group-hover:translate-x-1 transition-transform">→</span>
                   </Link>
                </div>
             ))}
           </div>
        </section>

      </main>
    </div>
  );
};

export default LiveUpdatesPage;
