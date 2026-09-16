import { useState, useEffect } from 'react';

interface BreakingItem {
  _id: string;
  title: string;
  slug?: string;
  created_at: string;
}

export default function BreakingTicker() {
  const [items, setItems] = useState<BreakingItem[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetch('/api/v1/dispatches/?category=Breaking&limit=10')
      .then(r => r.ok ? r.json() : [])
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => setCurrent(c => (c + 1) % items.length), 5000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <div className="bg-primary text-primary-foreground overflow-hidden">
      <div className="max-w-screen-xl mx-auto flex items-center h-9 px-4 sm:px-6 lg:px-10">
        <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded mr-3">Breaking</span>
        <div className="flex-1 overflow-hidden relative h-full flex items-center">
          {items.map((item, i) => (
            <a
              key={item._id}
              href={item.slug ? `/article/${item.slug}` : '#'}
              className={`absolute inset-0 flex items-center text-sm font-medium truncate transition-all duration-500 ${i === current ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}
            >
              {item.title}
            </a>
          ))}
        </div>
        <div className="flex gap-1 ml-3 shrink-0">
          {items.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? 'bg-white' : 'bg-white/30'}`} aria-label={`Go to item ${i + 1}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
