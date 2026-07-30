import { useState, useEffect, useRef } from "react";
import { Dispatch } from "@/lib/types";
import { X, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface StoryViewerModalProps {
  bytes: Dispatch[];
  initialIndex: number;
  onClose: () => void;
}

const STORY_DURATION = 5000; // 5 seconds per story

export function StoryViewerModal({ bytes, initialIndex, onClose }: StoryViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();
  const touchStartY = useRef<number | null>(null);

  const currentByte = bytes[currentIndex];

  const goNext = () => {
    if (currentIndex < bytes.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  useEffect(() => {
    if (isPaused) {
      if (progressInterval.current) clearInterval(progressInterval.current);
      return;
    }

    const intervalTime = 50; 
    const step = (intervalTime / STORY_DURATION) * 100;

    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev + step >= 100) {
          clearInterval(progressInterval.current!);
          goNext();
          return 100;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [currentIndex, isPaused]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    touchStartY.current = null;
    
    // Swipe down to close
    if (delta < -50) {
      onClose();
    }
    // Swipe up to read article
    if (delta > 50 && currentByte.articleSlug) {
      onClose();
      navigate(`/article/${currentByte.articleSlug}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white overflow-hidden flex items-center justify-center">
      {/* Background */}
      {currentByte.imageUrl ? (
        <div 
          className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-110"
          style={{ backgroundImage: `url(${currentByte.imageUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-black" />
      )}
      
      {/* Container */}
      <div 
        className="relative w-full h-full max-w-[500px] flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStartCapture={() => setIsPaused(true)}
        onTouchEndCapture={() => setIsPaused(false)}
      >
        {/* Progress Bars */}
        <div className="absolute top-4 left-0 right-0 z-20 px-2 flex gap-1">
          {bytes.map((_, idx) => (
            <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div 
                className={cn("h-full bg-white transition-all duration-75", 
                  idx < currentIndex ? "w-full" : 
                  idx === currentIndex ? "" : "w-0"
                )}
                style={idx === currentIndex ? { width: `${progress}%` } : undefined}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 left-0 right-0 z-20 px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
              {currentByte.category?.[0] || "N"}
            </div>
            <span className="font-semibold text-sm drop-shadow-md">{currentByte.category || "News Byte"}</span>
            <span className="text-white/60 text-xs ml-1">• {new Date(currentByte.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <button onClick={onClose} className="p-2 bg-black/20 hover:bg-black/40 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Click Zones for Navigation */}
        <div className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-pointer" onClick={(e) => { e.stopPropagation(); goPrev(); }} />
        <div className="absolute inset-y-0 right-0 w-2/3 z-10 cursor-pointer" onClick={(e) => { e.stopPropagation(); goNext(); }} />

        {/* Content */}
        <div className="relative z-0 flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-24 text-center pointer-events-none">
          {currentByte.imageUrl && (
            <img src={currentByte.imageUrl} alt="" className="w-48 h-48 sm:w-64 sm:h-64 object-cover rounded-2xl mb-8 shadow-2xl border-4 border-white/10" />
          )}
          <p className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold leading-snug drop-shadow-xl text-balance">
            {currentByte.text}
          </p>
        </div>

        {/* Footer Swipe Up (if article link exists) */}
        {currentByte.articleSlug && (
          <div className="absolute bottom-6 left-0 right-0 z-20 flex flex-col items-center animate-bounce text-white/80">
            <ChevronUp className="w-6 h-6" />
            <span className="text-xs font-bold uppercase tracking-widest mt-1">Swipe up to read</span>
          </div>
        )}
      </div>
    </div>
  );
}
