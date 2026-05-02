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
      
      <main className="mx-auto max-w-[900px] pt-20 sm:pt-28 pb-24 px-4 sm:px-8 animate-in fade-in duration-700">

        {/* Live Event Header */}
        <header className="mb-8 flex flex-col items-center text-center space-y-4 pb-8 border-b border-black/5 relative overflow-hidden">
           <div className="absolute inset-0 bg-primary/[0.03] opacity-30 z-0" />
           <div className="flex items-center gap-2 relative z-10 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-semibold">
             <RefreshCw className="h-3.5 w-3.5 animate-spin" /> {eventStatus}
           </div>
           <div className="space-y-3 relative z-10">
             <h1 className="text-4xl sm:text-6xl font-bold text-foreground tracking-tight leading-tight">Live updates</h1>
             <p className="text-sm text-muted-foreground">Real-time coverage as the story develops</p>
           </div>
        </header>

        {/* Timeline */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-black/5 pb-4 mb-4">
             <h3 className="text-sm font-semibold text-foreground">Timeline</h3>
             <button className="flex items-center gap-2 text-xs font-medium text-primary h-9 px-3 rounded-lg hover:bg-muted transition-colors">
               <Bell className="h-3.5 w-3.5" /> Get alerts
             </button>
          </div>

          <div className="space-y-6">
            {updates.map((update, i) => (
              <div key={update.id} className="relative group">
                {i !== updates.length - 1 && (
                  <div className="absolute top-11 left-5 w-px h-[calc(100%+1.5rem)] bg-black/5" />
                )}

                <div className="flex gap-4">
                  <div className="flex-none">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center border transition-colors",
                      update.type === 'major' ? "bg-primary border-primary/5 text-white" : "bg-black/[0.02] border-black/5 text-black/40"
                    )}>
                      {update.type === 'major' ? <Zap className="h-4 w-4 fill-white" /> : <Clock className="h-4 w-4" />}
                    </div>
                  </div>

                  <div className="flex-1 pb-6">
                    <div className="space-y-2">
                       <div className="flex items-center gap-3">
                         <span className="text-xs font-medium text-primary tabular-nums">{update.time} IST</span>
                         {update.type === 'major' && (
                           <div className="px-2 py-0.5 rounded bg-primary/10 text-[10px] font-semibold text-primary">Major update</div>
                         )}
                       </div>
                       <p className={cn(
                         "text-base sm:text-lg font-semibold leading-snug transition-colors",
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

        {/* Related coverage */}
        <section className="mt-16 pt-10 border-t border-black/5">
           <h3 className="text-sm font-semibold text-foreground mb-6 px-4">Related coverage</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {articles.slice(0, 2).map((a) => (
                <div key={a.id} className="p-6 rounded-2xl border border-black/5 hover:bg-black/5 transition-colors">
                   <h4 className="text-lg font-semibold text-foreground leading-snug mb-3 tracking-tight">{a.title}</h4>
                   <Link to={`/article/${a.slug}`} className="text-xs font-medium text-primary group flex items-center gap-1.5">
                     Read article <span className="group-hover:translate-x-1 transition-transform">→</span>
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
