import { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, Volume2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  bodyText: string;
}

const SPEED_OPTIONS = [1.0, 1.25, 1.5, 2.0];

export default function AudioPlayer({ title, bodyText }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [supported, setSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }

    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const cleanText = (raw: string) => {
    return raw.replace(/<[^>]*>?/gm, "").trim();
  };

  const handlePlay = () => {
    if (!supported) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      setIsPaused(false);
      return;
    }

    window.speechSynthesis.cancel();

    const fullText = `${title}. ${cleanText(bodyText)}`;
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.rate = SPEED_OPTIONS[speedIndex];
    utterance.pitch = 1.0;

    // Try to find an Indian English voice, fallback to UK English, then default
    let currentVoices = voices;
    if (currentVoices.length === 0) {
      currentVoices = window.speechSynthesis.getVoices();
    }
    
    let selectedVoice = currentVoices.find(v => v.lang === 'en-IN' || v.lang === 'en_IN' || v.name.includes("India"));
    if (!selectedVoice) {
      selectedVoice = currentVoices.find(v => v.lang.startsWith('en-GB') || v.lang.startsWith('en-UK'));
    }
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(100);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onboundary = (event) => {
      if (fullText.length > 0) {
        const percent = Math.min(100, Math.round((event.charIndex / fullText.length) * 100));
        setProgress(percent);
      }
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
    setProgress(0);
  };

  const handlePause = () => {
    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
  };

  const cycleSpeed = () => {
    const nextIdx = (speedIndex + 1) % SPEED_OPTIONS.length;
    setSpeedIndex(nextIdx);
    if (isPlaying && utteranceRef.current) {
      window.speechSynthesis.cancel();
      setTimeout(handlePlay, 100);
    }
  };

  if (!supported) return null;

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
                <Sparkles className="h-2.5 w-2.5" /> AI Voice
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Audio narration powered by Web Speech</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPlaying ? (
            <Button
              type="button"
              size="sm"
              onClick={handlePlay}
              className="gap-2 font-semibold text-xs"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> {isPaused ? "Resume" : "Play Narration"}
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
