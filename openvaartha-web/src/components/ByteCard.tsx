import { useEffect, useState, type SyntheticEvent, type MouseEvent } from 'react';
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

export const shareByte = async (byte: Dispatch, shareUrl: string) => {
  const shareData = { title: `${BRAND.name} · Bytes`, text: byte.text, url: shareUrl };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
    throw new Error('Web Share API unavailable');
  } catch (err: unknown) {
    // User cancelling the share sheet isn't a failure — don't fall through
    // to the clipboard toast. Any other failure (desktop, denied, etc.)
    // degrades gracefully to copying the link.
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Could not share this byte');
    }
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
  const hasVideo = !!byte.videoUrl;
  const hasImage = !!byte.imageUrl && !hasVideo;
  const tone = TONES[toneIndex % TONES.length];

  // Detect landscape media so it never gets zoom-cropped inside the portrait
  // frame — landscape images/videos get the Reels treatment instead: a blurred
  // full-bleed backdrop with the media centered (object-contain).
  const [isLandscape, setIsLandscape] = useState(false);
  const [isLandscapeVideo, setIsLandscapeVideo] = useState(false);
  useEffect(() => {
    setIsLandscape(false);
    setIsLandscapeVideo(false);
  }, [byte.imageUrl, byte.videoUrl]);

  const handleImageLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    setIsLandscape(e.currentTarget.naturalWidth > e.currentTarget.naturalHeight);
  };
  const handleVideoMeta = (e: SyntheticEvent<HTMLVideoElement>) => {
    setIsLandscapeVideo(e.currentTarget.videoWidth > e.currentTarget.videoHeight);
  };
  const togglePlay = (e: MouseEvent<HTMLVideoElement>) => {
    e.stopPropagation();
    const v = e.currentTarget;
    if (v.paused) { v.play().catch(() => {}); } else { v.pause(); }
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-black text-white select-none">
      {/* Full-bleed media — a video (muted, looping, tap to play/pause) or
          photo takes the frame; otherwise a brand gradient. Landscape media
          gets a blurred fill behind a centered, fully-visible frame. */}
      {hasVideo ? (
        isLandscapeVideo ? (
          <>
            <video
              src={byte.videoUrl!}
              className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110 opacity-70"
              muted loop autoPlay playsInline
              aria-hidden
            />
            <video
              src={byte.videoUrl!}
              className="absolute inset-0 h-full w-full object-contain"
              muted loop autoPlay playsInline
              onClick={togglePlay}
              onLoadedMetadata={handleVideoMeta}
              aria-label="Byte video"
            />
          </>
        ) : (
          <video
            src={byte.videoUrl!}
            className="absolute inset-0 h-full w-full object-cover"
            muted loop autoPlay playsInline
            onClick={togglePlay}
            onLoadedMetadata={handleVideoMeta}
            aria-label="Byte video"
          />
        )
      ) : hasImage ? (
        isLandscape ? (
          <>
            <img
              src={byte.imageUrl!}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110 opacity-70"
            />
            <img
              src={byte.imageUrl!}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
              onLoad={handleImageLoad}
            />
          </>
        ) : (
          <img
            src={byte.imageUrl!}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onLoad={handleImageLoad}
          />
        )
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

      {/* Bottom caption — pointer-events-none so the full-width overlay never
          swallows taps aimed at the action rail; only the Read-full-story
          button re-enables clicks. */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-4 sm:p-6 pb-6 pr-20 sm:pr-24 pointer-events-none">
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
                className="mt-5 pointer-events-auto inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white bg-white/10 border border-white/25 backdrop-blur rounded-full px-4 py-2 press"
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
