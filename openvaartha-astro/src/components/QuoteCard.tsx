import { useState, useRef } from 'react';

interface QuoteCardProps {
  title: string;
  slug: string;
  summary?: string;
  category?: string;
}

export default function QuoteCard({ title, slug, summary, category }: QuoteCardProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/article/${slug}` : '';

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const downloadCard = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, { backgroundColor: '#0f1724', scale: 2 });
      const link = document.createElement('a');
      link.download = `${slug}-quote.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {}
    setDownloading(false);
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-surface">
      <div ref={cardRef} className="p-6 sm:p-8 bg-[#0f1724] text-white">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-8 bg-primary rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{category || 'Open Vaartha'}</span>
        </div>
        <h3 className="font-serif text-xl sm:text-2xl font-bold leading-snug mb-4">{title}</h3>
        {summary && <p className="text-sm text-white/70 leading-relaxed line-clamp-3">{summary}</p>}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2">
          <span className="font-display text-xs font-bold tracking-tight">Open Vaartha</span>
          <span className="text-[10px] text-white/40">openvaartha.com</span>
        </div>
      </div>

      <div className="flex items-center gap-2 p-4 border-t border-border">
        <button onClick={copyLink} className="flex-1 h-9 rounded-full border border-border text-xs font-bold hover:bg-muted transition-colors">
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <button onClick={downloadCard} disabled={downloading} className="flex-1 h-9 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover transition-colors disabled:opacity-50">
          {downloading ? 'Generating...' : 'Download card'}
        </button>
      </div>
    </div>
  );
}
