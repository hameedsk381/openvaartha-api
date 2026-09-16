import { useState, useRef, useEffect } from 'react';

interface AudioPlayerProps {
  articleSlug: string;
  title: string;
}

export default function AudioPlayer({ articleSlug, title }: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getAudioUrl = () => '/api/v1/articles/' + articleSlug + '/audio/';

  const toggle = async () => {
    if (!audioRef.current) {
      setLoading(true);
      const audio = new Audio(getAudioUrl());
      audioRef.current = audio;
      audio.addEventListener('loadedmetadata', () => { setDuration(audio.duration); setLoading(false); });
      audio.addEventListener('timeupdate', () => { if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100); });
      audio.addEventListener('ended', () => { setPlaying(false); setProgress(0); });
      audio.addEventListener('error', () => setLoading(false));
      await audio.play().catch(() => {});
      setPlaying(true);
    } else {
      if (playing) { audioRef.current.pause(); setPlaying(false); }
      else { await audioRef.current.play().catch(() => {}); setPlaying(true); }
    }
  };

  useEffect(() => { return () => { audioRef.current?.pause(); audioRef.current = null; }; }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = String(Math.floor(s % 60)).padStart(2, '0');
    return m + ':' + sec;
  };

  return (
    <div className="bg-muted/30 rounded-xl p-4 flex items-center gap-4">
      <button onClick={toggle} disabled={loading} className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:bg-primary-hover transition-colors disabled:opacity-50" aria-label={playing ? 'Pause' : 'Play'}>
        {loading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
        ) : playing ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-medium text-primary uppercase tracking-wider">Listen</span>
          {duration > 0 && <span className="text-[10px] text-muted-foreground">{formatTime(duration * progress / 100)} / {formatTime(duration)}</span>}
        </div>
        <div
          className="relative h-1.5 bg-border rounded-full overflow-hidden cursor-pointer"
          onClick={(e) => {
            if (audioRef.current && duration) {
              const r = e.currentTarget.getBoundingClientRect();
              audioRef.current.currentTime = ((e.clientX - r.left) / r.width) * duration;
            }
          }}
        >
          <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all" style={{ width: progress + '%' }} />
        </div>
      </div>
    </div>
  );
}
