import { useState } from 'react';
import { Play, Volume2 } from 'lucide-react';
import type { Dispatch } from '@/lib/types';

export const BYTE_TONES = [
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

interface ByteThumbProps {
  byte: Dispatch;
  toneIndex: number;
}

/**
 * Compact media preview for the Bytes feed grid — a muted still frame of the
 * video (or the photo / brand gradient), with a small play badge overlaid when
 * the byte has video. Reuses the same landscape-aware blurred-backdrop logic as
 * the full-screen ByteCard so previews and the viewer agree.
 */
export default function ByteThumb({ byte, toneIndex }: ByteThumbProps) {
  const hasVideo = !!byte.videoUrl;
  const hasImage = !!byte.imageUrl && !hasVideo;
  const tone = BYTE_TONES[toneIndex % BYTE_TONES.length];
  const [isLandscape, setIsLandscape] = useState(false);

  const handleVideoMeta = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    setIsLandscape(e.currentTarget.videoWidth > e.currentTarget.videoHeight);
  };
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLandscape(e.currentTarget.naturalWidth > e.currentTarget.naturalHeight);
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      {hasVideo ? (
        <>
          {isLandscape && (
            <video
              src={byte.videoUrl!}
              muted loop playsInline preload="metadata"
              className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110 opacity-70"
              aria-hidden
            />
          )}
          <video
            src={byte.videoUrl!}
            muted loop playsInline preload="metadata"
            className={`absolute inset-0 h-full w-full ${isLandscape ? 'object-contain' : 'object-cover'}`}
            onLoadedMetadata={handleVideoMeta}
            aria-label="Byte preview"
          />
        </>
      ) : hasImage ? (
        <>
          {isLandscape && (
            <img
              src={byte.imageUrl!}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110 opacity-70"
            />
          )}
          <img
            src={byte.imageUrl!}
            alt=""
            className={`absolute inset-0 h-full w-full ${isLandscape ? 'object-contain' : 'object-cover'}`}
            onLoad={handleImageLoad}
          />
        </>
      ) : (
        <div className={`absolute inset-0 ${tone.bg}`} />
      )}

      {/* Legibility scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />

      {/* Play badge for video bytes */}
      {hasVideo && (
        <div className="absolute top-3 right-3 flex items-center gap-1 h-7 px-2 rounded-full bg-black/45 backdrop-blur border border-white/25 text-white">
          <Play className="h-3.5 w-3.5 fill-current" />
          <Volume2 className="h-3 w-3 opacity-70" />
        </div>
      )}

      <span className="absolute bottom-3 left-3 text-[10px] font-bold uppercase tracking-widest text-white/80 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-white/70" /> {relativeTime(byte.createdAt)}
      </span>
    </div>
  );
}