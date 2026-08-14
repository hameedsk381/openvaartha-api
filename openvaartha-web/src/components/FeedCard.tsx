import React, { useRef, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Share2, ExternalLink } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { cn, relativeTime } from '@/lib/utils';
import type { Dispatch } from '@/lib/types';
import { categoryColors } from '@/lib/types';
import { toast } from 'sonner';

interface FeedCardProps {
  dispatch: Dispatch;
  onLike?: (id: string) => void;
}

export default function FeedCard({ dispatch, onLike }: FeedCardProps) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [likeAnimating, setLikeAnimating] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoRef.current?.play().catch(() => {});
          } else {
            videoRef.current?.pause();
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, [dispatch.videoUrl]);

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 300);
    if (onLike) onLike(dispatch.id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: dispatch.articleTitle || "OpenVaartha Dispatch",
        text: dispatch.text,
        url: `${window.location.origin}/feed/${dispatch.id}`
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/feed/${dispatch.id}`);
      toast.success("Link copied to clipboard");
    }
  };

  const handleCardClick = () => {
    navigate(`/feed/${dispatch.id}`);
  };

  const createdAt = dispatch.createdAt || (dispatch as any).created_at;
  const hasLiked = dispatch.hasLiked ?? (dispatch as any).has_liked ?? false;
  const likeCount = dispatch.likeCount ?? (dispatch as any).like_count ?? 0;
  const articleSlug = dispatch.articleSlug || (dispatch as any).article_slug;
  const articleTitle = dispatch.articleTitle || (dispatch as any).article_title;
  const imageUrl = dispatch.imageUrl || (dispatch as any).image_url;
  const videoUrl = dispatch.videoUrl || (dispatch as any).video_url;

  const categoryColor = dispatch.category ? categoryColors[dispatch.category] : 'bg-primary';

  return (
    <article 
      onClick={handleCardClick}
      className={cn(
        "group cursor-pointer w-full max-w-xl mx-auto rounded-2xl border border-border/60 bg-card p-4 sm:p-5 mb-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200",
        "text-card-foreground"
      )}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full gradient-maroon p-0.5 ring-2 ring-primary/20 flex items-center justify-center shadow-xs overflow-hidden shrink-0">
            <img src={BRAND.iconWhitePath} alt={BRAND.shortName} className="w-5 h-5 object-contain" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-sm sm:text-base leading-tight group-hover:text-primary transition-colors truncate">
                {BRAND.shortName}
              </span>
              <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-primary text-white text-[9px] font-bold shrink-0">
                ✓
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {relativeTime(createdAt)}
            </span>
          </div>
        </div>

        {dispatch.category && (
          <span className={cn("chip text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full text-white font-bold tracking-wide uppercase shrink-0 shadow-xs", categoryColor)}>
            {dispatch.category}
          </span>
        )}
      </div>

      {/* Body Text */}
      <p className="text-[15px] sm:text-base leading-relaxed text-foreground/90 font-normal whitespace-pre-wrap break-words mb-3">
        {dispatch.text}
      </p>

      {/* Media Attachment */}
      {imageUrl && !videoUrl && (
        <div className="mb-3.5 rounded-xl overflow-hidden border border-border/40 max-h-[380px] relative bg-muted/20">
          <img 
            src={imageUrl} 
            alt="Dispatch media" 
            className="w-full h-full object-cover max-h-[380px] group-hover:scale-[1.01] transition-transform duration-300"
          />
        </div>
      )}

      {videoUrl && (
        <div className="mb-3.5 rounded-xl overflow-hidden border border-border/40 max-h-[380px] bg-black relative">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            muted
            loop
            playsInline
            className="w-full h-full max-h-[380px] object-contain"
          />
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-border/30 text-muted-foreground">
        <div className="flex items-center gap-2">
          {/* Like Button */}
          <button 
            onClick={handleLike}
            className={cn(
              "group/btn flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors press text-xs font-semibold",
              hasLiked && "text-red-500 bg-red-500/10"
            )}
            aria-label="Like"
          >
            <Heart 
              size={16} 
              className={cn(
                "transition-all duration-300",
                hasLiked ? "fill-red-500 text-red-500" : "stroke-[1.75]",
                likeAnimating && "scale-125"
              )} 
            />
            <span>{likeCount}</span>
          </button>

          {/* Share Button */}
          <button 
            onClick={handleShare}
            className="group/btn flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-primary/10 hover:text-primary transition-colors press text-xs font-semibold"
            aria-label="Share"
          >
            <Share2 size={16} className="stroke-[1.75]" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>

        {/* Read Full Story Button */}
        {articleSlug && (
          <Link
            to={`/article/${articleSlug}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-xs press"
          >
            <span>Full Story</span>
            <ExternalLink size={13} className="stroke-[2]" />
          </Link>
        )}
      </div>
    </article>
  );
}
