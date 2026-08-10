import { useState, useRef } from "react";
import { Play, Pause, Square, Volume2, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api";

interface Props {
  title: string;
  bodyText: string;
  articleId?: string;
}

const SPEED_OPTIONS = [1.0, 1.25, 1.5, 2.0];

export default function AudioPlayer({ title, articleId }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = () => {
    if (!articleId) return;

    if (isPaused && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      setIsPaused(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    setIsLoading(true);
    const audioUrl = `${API_BASE}/articles/${articleId}/tts`;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.playbackRate = SPEED_OPTIONS[speedIndex];

    audio.oncanplay = () => {
      setIsLoading(false);
      audio.play();
      setIsPlaying(true);
      setIsPaused(false);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(100);
    };

    audio.onerror = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setIsPaused(false);
    };

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    
    audio.load();
  };

  const handlePause = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
  };

  const cycleSpeed = () => {
    const nextIdx = (speedIndex + 1) % SPEED_OPTIONS.length;
    setSpeedIndex(nextIdx);
    if (audioRef.current) {
      audioRef.current.playbackRate = SPEED_OPTIONS[nextIdx];
    }
  };

  return (
    <div className="my-6 rounded-xl border border-primary/20 bg-card/60 p-4 backdrop-blur shadow-xs">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Volume2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-foreground font-sans">Listen to Story</h4>
              <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" /> Groq TTS
              </span>
            </div>
            <p className="text-xs text-muted-foreground">High-quality AI audio narration</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPlaying ? (
            <Button
              type="button"
              size="sm"
              onClick={handlePlay}
              disabled={isLoading}
              className="gap-2 font-semibold text-xs min-w-[120px]"
            >
              {isLoading ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...</>
              ) : (
                <><Play className="h-3.5 w-3.5 fill-current" /> {isPaused ? "Resume" : "Play Narration"}</>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handlePause}
              className="gap-2 font-semibold text-xs"
            >
              <Pause className="h-3.5 w-3.5 fill-current" /> Pause
            </Button>
          )}

          {(isPlaying || isPaused) && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleStop}
              className="h-8 w-8 p-0"
              title="Stop"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </Button>
          )}

          <button
            type="button"
            onClick={cycleSpeed}
            className="px-2 py-1 rounded-md text-xs font-bold bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Playback Speed"
          >
            {SPEED_OPTIONS[speedIndex]}x
          </button>
        </div>
      </div>

      {(isPlaying || isPaused || progress > 0) && (
        <div className="mt-3 w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
