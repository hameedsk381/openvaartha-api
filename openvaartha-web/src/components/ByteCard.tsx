import { Share2, ArrowUpRight } from 'lucide-react';
import { AnimatedIcon } from '@/components/ui/animated-icon';
import { BRAND } from '@/lib/brand';
import type { Dispatch } from '@/lib/types';
import { toast } from 'sonner';

// Each tone pairs a brand background with the CSS-variable foreground it was
// designed for (see index.css's documented contrast ratios), so text always
// reads clearly regardless of theme — never hardcode white/black against these.
// Only used when a byte has no image; an image byte always gets a dark
// overlay + white text instead, since that's guaranteed-legible over any photo.
export const TONES = [
  { bg: 'gradient-maroon', text: 'text-primary-foreground', tagBg: 'bg-black/15', logo: 'white' as const },
  { bg: 'gradient-beige', text: 'text-secondary-foreground', tagBg: 'bg-black/10', logo: 'maroon' as const },
];

const relativeTime = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export const shareByte = (byte: Dispatch, shareUrl: string) => {
  const shareData = { title: `${BRAND.name} · Bytes`, text: byte.text, url: shareUrl };
  if (navigator.share) {
    navigator.share(shareData).catch(() => {});
  } else {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard');
  }
};

interface ByteCardProps {
  byte: Dispatch;
  toneIndex?: number;
  shareUrl: string;
  counter?: { current: number; total: number };
  heightClassName?: string;
}

export default function ByteCard({ byte, toneIndex = 0, shareUrl, counter, heightClassName = 'h-full' }: ByteCardProps) {
  const hasImage = !!byte.imageUrl;
  const tone = TONES[toneIndex % TONES.length];
  const textClass = hasImage ? 'text-white' : tone.text;
  const tagBgClass = hasImage ? 'bg-black/30' : tone.tagBg;

  return (
    <div className={`relative w-full ${heightClassName} flex flex-col justify-end overflow-hidden ${hasImage ? 'bg-black' : tone.bg}`}>
      {hasImage ? (
        <>
          <img src={byte.imageUrl!} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
        </>
      ) : (
        // No photo for this byte — the brand mark stands in as the visual,
        // large and centered, so the card still looks designed rather than bare text.
        <img
          src={tone.logo === 'white' ? BRAND.iconWhitePath : BRAND.iconMaroonPath}
          alt=""
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 sm:h-56 sm:w-56 object-contain opacity-[0.14] pointer-events-none"
        />
      )}

      <div className="relative px-6 sm:px-16 pb-16 sm:pb-20">
        <div className="max-w-2xl mx-auto w-full">
          <div className={`flex items-center gap-2 mb-6 ${textClass}`}>
            <img
              src={hasImage || tone.logo === 'white' ? BRAND.iconWhitePath : BRAND.iconMaroonPath}
              alt=""
              className="h-5 w-5 object-contain opacity-90"
            />
            <span className="text-xs font-black uppercase tracking-[0.2em] opacity-90">{BRAND.shortName}</span>
          </div>

          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <span className={`relative inline-flex h-2 w-2 ${textClass}`}>
              <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
            </span>
            <span className={`text-[11px] font-bold uppercase tracking-[0.2em] opacity-80 ${textClass}`}>
              {relativeTime(byte.createdAt)}
            </span>
            {byte.category && (
              <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 ${tagBgClass} ${textClass}`}>
                {byte.category}
              </span>
            )}
          </div>

          <p className={`font-serif text-2xl sm:text-4xl font-bold leading-[1.2] tracking-tight ${textClass}`}>
            {byte.text}
          </p>

          <div className="mt-8 flex items-center justify-between gap-4">
            {byte.articleSlug ? (
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] ${textClass}`}>
                Read full story
                <AnimatedIcon animationType="arrowUpRight">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </AnimatedIcon>
              </span>
            ) : <span />}

            <button
              onClick={(e) => { e.stopPropagation(); shareByte(byte, shareUrl); }}
              aria-label="Share this byte"
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold uppercase tracking-wider press ${tagBgClass} ${textClass}`}
            >
              <AnimatedIcon animationType="scale">
                <Share2 className="h-3.5 w-3.5" />
              </AnimatedIcon>
              Share
            </button>
          </div>
        </div>
      </div>

      {counter && (
        <span className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-semibold tabular-nums opacity-70 ${textClass}`}>
          {counter.current} / {counter.total}
        </span>
      )}
    </div>
  );
}
