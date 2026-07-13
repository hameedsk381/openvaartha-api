import { Share2, ArrowUpRight } from 'lucide-react';
import { AnimatedIcon } from '@/components/ui/animated-icon';
import { BRAND } from '@/lib/brand';
import type { Dispatch } from '@/lib/types';
import { toast } from 'sonner';

// Each tone is only used for the visual header (image letterbox / no-image
// watermark banner) — the content region below always uses the theme's
// normal card/foreground colors, so headline text stays legible regardless
// of brand color and theme.
export const TONES = [
  { bg: 'gradient-maroon', logo: 'white' as const },
  { bg: 'gradient-beige', logo: 'maroon' as const },
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
}

/**
 * A single byte card: image (or brand watermark, if no photo) on top as its
 * own region, all text below it on a plain readable surface — never text
 * laid over a photo. Long headlines scroll within the content region
 * instead of growing into the page's fixed header above or the visual
 * region's fixed height.
 */
export default function ByteCard({ byte, toneIndex = 0, shareUrl }: ByteCardProps) {
  const hasImage = !!byte.imageUrl;
  const tone = TONES[toneIndex % TONES.length];

  return (
    <div className="relative h-full w-full flex flex-col bg-card overflow-hidden">
      <button
        onClick={(e) => { e.stopPropagation(); shareByte(byte, shareUrl); }}
        aria-label="Share this byte"
        className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-background/90 backdrop-blur border border-border flex items-center justify-center text-foreground shadow-md press"
      >
        <AnimatedIcon animationType="scale">
          <Share2 className="h-4 w-4" />
        </AnimatedIcon>
      </button>

      {/* Visual region */}
      <div
        className={`relative w-full shrink-0 overflow-hidden flex items-center justify-center ${hasImage ? 'h-[38%] sm:h-[42%] bg-black' : `h-24 sm:h-28 ${tone.bg}`}`}
      >
        {hasImage ? (
          <img src={byte.imageUrl!} alt="" className="h-full w-full object-cover" />
        ) : (
          <img
            src={tone.logo === 'white' ? BRAND.iconWhitePath : BRAND.iconMaroonPath}
            alt=""
            className="h-10 w-10 sm:h-12 sm:w-12 object-contain opacity-90"
          />
        )}
      </div>

      {/* Content region — always plain, always readable */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-center px-6 sm:px-10 py-6">
        <div className="max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="relative inline-flex h-2 w-2 text-primary">
              <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {relativeTime(byte.createdAt)}
            </span>
            {byte.category && <span className="tag">{byte.category}</span>}
          </div>

          <p className="font-serif text-xl sm:text-3xl font-bold leading-snug tracking-tight text-foreground">
            {byte.text}
          </p>

          {byte.articleSlug && (
            <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Read full story
              <AnimatedIcon animationType="arrowUpRight">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </AnimatedIcon>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
