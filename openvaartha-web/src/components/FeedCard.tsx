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

  const categoryColor = dispatch.category ? categoryColors[dispatch.category] : 'bg-muted';

  return (
    <div 
      onClick={handleCardClick}
      className={cn(
        "cursor-pointer w-full max-w-2xl mx-auto border-b border-border hover:bg-muted/30 transition-colors p-4 sm:p-5 flex gap-3 sm:gap-4",
        "bg-background text-foreground"
      )}
    >
      {/* Avatar */}
      <div className="shrink-0 pt-1">
        <div className="w-10 h-10 rounded-full gradient-maroon flex items-center justify-center shadow-sm overflow-hidden border border-border/50">
          <img src={BRAND.iconWhitePath} alt={BRAND.shortName} className="w-5 h-5 object-contain" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-[15px] hover:underline truncate">
            {BRAND.shortName}
          </span>
          {dispatch.category && (
            <>
              <span className="text-muted-foreground text-sm">·</span>
              <span className={cn("chip text-xs px-2 py-0.5 rounded-full text-white font-medium", categoryColor)}>
                {dispatch.category}
              </span>
            </>
          )}
          <span className="text-muted-foreground text-sm">·</span>
          <span className="text-muted-foreground text-sm hover:underline shrink-0">
            {relativeTime(createdAt)}
          </span>
        </div>

        <p className="text-[15px] leading-snug whitespace-pre-wrap break-words mb-3">
          {dispatch.text}
        </p>

        {imageUrl && !videoUrl && (
          <div className="mb-3 rounded-xl overflow-hidden border border-border max-h-[400px]">
            <img 
              src={imageUrl} 
              alt="Dispatch media" 
              className="w-full h-full object-cover max-h-[400px]"
            />
          </div>
        )}

        {videoUrl && (
          <div className="mb-3 rounded-xl overflow-hidden border border-border max-h-[400px] bg-black">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              muted
              loop
              playsInline
              className="w-full h-full max-h-[400px] object-contain"
            />
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center gap-6 mt-1 text-muted-foreground">
          <button 
            onClick={handleLike}
            className={cn(
              "group flex items-center gap-1.5 hover:text-red-500 transition-colors press rounded-full p-1 -ml-1",
              hasLiked && "text-red-500"
            )}
            aria-label="Like"
          >
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full group-hover:bg-red-500/10 transition-colors">
              <Heart 
                size={18} 
                className={cn(
                  "transition-all duration-300",
                  hasLiked ? "fill-red-500 text-red-500" : "stroke-[1.5]",
                  likeAnimating && "scale-125"
                )} 
              />
            </div>
            <span className={cn("text-xs font-medium", hasLiked && "text-red-500")}>
              {likeCount}
            </span>
          </button>

          <button 
            onClick={handleShare}
            className="group flex items-center gap-1.5 hover:text-primary transition-colors press rounded-full p-1"
            aria-label="Share"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full group-hover:bg-primary/10 transition-colors">
              <Share2 size={18} className="stroke-[1.5]" />
            </div>
          </button>

          {articleSlug && (
            <Link
              to={`/article/${articleSlug}`}
              onClick={(e) => e.stopPropagation()}
              className="group flex items-center gap-1.5 hover:text-primary transition-colors ml-auto press rounded-full p-1 pr-3"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full group-hover:bg-primary/10 transition-colors">
                <ExternalLink size={18} className="stroke-[1.5]" />
              </div>
              <span className="text-xs font-medium hidden sm:inline">Full Story</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );

}
