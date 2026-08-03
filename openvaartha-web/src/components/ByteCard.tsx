import { useEffect, useRef, useState, type SyntheticEvent, type MouseEvent } from 'react';
import { Share2, Play, Pause, Volume2, VolumeX, Music4 } from 'lucide-react';
import { AnimatedIcon } from '@/components/ui/animated-icon';
import { BRAND } from '@/lib/brand';
import type { Dispatch } from '@/lib/types';
import { toast } from 'sonner';

// Only used as the backdrop when a byte has neither a video nor a photo —
// the Reels-style maroon/beige gradient instead of a plain black frame.
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
  /** Play the video only for the active reel (swipe stack mutes the rest). */
  isActive?: boolean;
}

/**
 * A single byte as an Instagram-Reels-style video reel: the video (or, for
 * legacy image bytes, the photo/gradient) fills the portrait frame, tap
 * toggles play/pause, a mute toggle + spinning music disc sit on the right
 * action rail, and the caption overlays the bottom-left like a Reels
 * description. Landscape media is never zoom-cropped — it gets a blurred
 * full-bleed backdrop with the media centered (object-contain).
 */
export default function ByteCard({ byte, toneIndex = 0, shareUrl, onReadStory, isActive = true }: ByteCardProps) {
  const hasVideo = !!byte.videoUrl;
  const hasImage = !!byte.imageUrl && !hasVideo;
  const tone = TONES[toneIndex % TONES.length];

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [showPauseHint, setShowPauseHint] = useState(false);

  useEffect(() => {
    setIsLandscape(false);
    setPaused(false);
  }, [byte.imageUrl, byte.videoUrl]);

  // Reels behaviour: only the on-screen reel plays; off-screen ones pause so
  // only one video is ever decoding at a time.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !hasVideo) return;
    if (isActive) {
      v.play().catch(() => {});
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  }, [isActive, hasVideo]);

  const handleMediaLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    setIsLandscape(e.currentTarget.naturalWidth > e.currentTarget.naturalHeight);
  };
  const handleVideoMeta = (e: SyntheticEvent<HTMLVideoElement>) => {
    setIsLandscape(e.currentTarget.videoWidth > e.currentTarget.videoHeight);
  };

  const togglePlay = (e: MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
      setShowPauseHint(true);
      setTimeout(() => setShowPauseHint(false), 650);
    }
  };

  const toggleMute = (e: MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-black text-white select-none">
      {/* Full-bleed media — video takes the frame when present; legacy photo
          bytes and the brand gradient remain as fallbacks. */}
      {hasVideo ? (
        isLandscape ? (
          <>
            <video
              src={byte.videoUrl!}
              className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110 opacity-70"
              muted loop autoPlay playsInline
              aria-hidden
            />
            <video
              ref={videoRef}
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
            ref={videoRef}
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
              onLoad={handleMediaLoad}
            />
          </>
        ) : (
          <img
            src={byte.imageUrl!}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onLoad={handleMediaLoad}
          />
        )
      ) : (
        <div className={`absolute inset-0 ${tone.bg}`} />
      )}

      {/* Legibility scrim — keeps the overlaid text readable over any frame */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/25" />

      {/* Tap play/pause hint — a pause icon flashes when you pause, a play
          icon stays while paused (Instagram-reel style). */}
      {hasVideo && (showPauseHint || paused) && (
        <div
          className={`absolute inset-0 z-10 flex items-center justify-center pointer-events-none transition-opacity duration-500 ${
            showPauseHint ? 'opacity-100' : 'opacity-90'
          }`}
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-black/40 backdrop-blur border border-white/25">
            {paused ? (
              <Play className="h-9 w-9 fill-current ml-1" />
            ) : (
              <Pause className="h-9 w-9 fill-current" />
            )}
          </span>
        </div>
      )}

      {/* Right action rail — avatar/category up top, Share below, spinning
          music disc at the bottom (also toggles sound on video bytes). */}
      <div className="absolute right-2 sm:right-3 bottom-24 sm:bottom-28 z-20 flex flex-col items-center gap-5">
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

        {hasVideo && (
          <button
            onClick={toggleMute}
            aria-label={muted ? 'Unmute video' : 'Mute video'}
            className="relative h-12 w-12 rounded-full bg-white/10 border border-white/25 backdrop-blur flex items-center justify-center shadow-lg press"
          >
            <span
              className="absolute inset-0 flex items-center justify-center rounded-full"
              style={{ animation: 'spin 5s linear infinite' }}
            >
              <Music4 className="h-5 w-5" />
            </span>
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="h-7 w-7 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </span>
            </span>
          </button>
        )}
      </div>

      {/* Bottom caption — Reels-style: handle row, caption, music line. The
          overlay is pointer-events-none so taps reach the video/rail; only
          the "Read full story" link re-enables clicks. */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-4 sm:p-5 pb-8 pr-20 sm:pr-24 pointer-events-none">
        <div className="flex items-center gap-2 mb-2.5">
          <img
            src={BRAND.iconWhitePath}
            alt=""
            className="h-8 w-8 rounded-full border border-white/40 bg-white/10 object-contain p-1"
          />
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold">{byte.category || BRAND.shortName}</span>
            <span className="text-xs text-white/60">· {relativeTime(byte.createdAt)}</span>
          </div>
        </div>

        <p className="font-sans text-lg sm:text-xl font-semibold leading-snug text-white drop-shadow-lg line-clamp-4">
          {byte.text}
        </p>

        <div className="mt-3 flex items-center gap-1.5 text-sm text-white/85">
          <Music4 className="h-4 w-4 shrink-0" />
          <span>{BRAND.shortName} · Bytes{hasVideo ? ' · Original audio' : ''}</span>
        </div>

        {byte.articleSlug && (
          onReadStory ? (
            <button
              onClick={(e) => { e.stopPropagation(); onReadStory(); }}
              className="mt-3 pointer-events-auto inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 underline decoration-white/40 underline-offset-4 hover:text-white press"
            >
              Read full story
            </button>
          ) : (
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              Read full story
            </span>
          )
        )}
      </div>
    </div>
  );
}
