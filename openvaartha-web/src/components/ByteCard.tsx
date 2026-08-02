import { Share2, ArrowUpRight } from 'lucide-react';
import { AnimatedIcon } from '@/components/ui/animated-icon';
import { BRAND } from '@/lib/brand';
import type { Dispatch } from '@/lib/types';
import { toast } from 'sonner';

// Each tone is only used for the full-bleed backdrop when a byte has no
// photo — a Reels-style maroon/beige gradient instead of the old letterbox.
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
  onReadStory?: () => void;
}

/**
 * A single byte rendered as a full-screen Reels-style card: the photo (or a
 * brand gradient, if none) fills the frame edge-to-edge, a dark scrim keeps
 * the overlaid caption legible, and an Instagram-style action rail on the
 * right carries Share + the brand mark.
 */
export default function ByteCard({ byte, toneIndex = 0, shareUrl, onReadStory }: ByteCardProps) {
  const hasImage = !!byte.imageUrl;
  const tone = TONES[toneIndex % TONES.length];

  return (
    <div className="relative h-full w-full overflow-hidden bg-black text-white select-none">
      {/* Full-bleed media */}
      {hasImage ? (
        <img src={byte.imageUrl!} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className={`absolute inset-0 ${tone.bg}`} />
      )}

      {/* Legibility scrim — keeps the overlaid text readable over any frame */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/35" />

      {/* Right action rail */}
      <div className="absolute right-2 sm:right-3 bottom-28 sm:bottom-32 z-20 flex flex-col items-center gap-5">
        <div className="flex flex-col items-center gap-1.5">
          <div className="h-11 w-11 rounded-full bg-white/10 border-2 border-white/40 backdrop-blur flex items-center justify-center overflow-hidden shadow-lg">
            <img src={BRAND.iconWhitePath} alt={BRAND.shortName} className="h-6 w-6 object-contain" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-white/70">
            {byte.category || 'OV'}
          </span>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); shareByte(byte, shareUrl); }}
          aria-label="Share this byte"
          className="flex flex-col items-center gap-1 text-white press"
        >
          <span className="h-11 w-11 rounded-full bg-white/10 border border-white/25 backdrop-blur flex items-center justify-center shadow-lg">
            <AnimatedIcon animationType="scale">
              <Share2 className="h-5 w-5" />
            </AnimatedIcon>
          </span>
          <span className="text-[10px] font-semibold text-white/70">Share</span>
        </button>
      </div>

      {/* Bottom caption */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-4 sm:p-6 pb-6 pr-20 sm:pr-24">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="relative inline-flex h-2 w-2 text-white">
              <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
              {relativeTime(byte.createdAt)}
            </span>
            {byte.category && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15 border border-white/25 backdrop-blur">
                {byte.category}
              </span>
            )}
          </div>

          <p className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold leading-snug tracking-tight text-white drop-shadow-xl">
            {byte.text}
          </p>

          {byte.articleSlug && (
            onReadStory ? (
              <button
                onClick={(e) => { e.stopPropagation(); onReadStory(); }}
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white bg-white/10 border border-white/25 backdrop-blur rounded-full px-4 py-2 press"
              >
                Read full story
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white bg-white/10 border border-white/25 backdrop-blur rounded-full px-4 py-2">
                Read full story
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
