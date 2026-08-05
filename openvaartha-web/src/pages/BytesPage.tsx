import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '@/components/Footer';
import { useDispatches } from '@/lib/api-hooks';
import ByteThumb, { BYTE_TONES } from '@/components/ByteThumb';
import BytesViewer from '@/components/BytesViewer';
import { BytesPageSkeleton } from '@/components/PageSkeletons';
import { Radio } from 'lucide-react';

/**
 * Bytes feed — today's dispatches as a browseable card grid. Tap any card to
 * open the full-screen BytesViewer carousel. The grid gives an at-a-glance
 * sense of what's been filed today (no more guessing inside a black stack),
 * with each card showing its media preview, caption, section, and recency.
 */
const BytesPage = () => {
  const { data: bytes = [], isLoading } = useDispatches(100, { todayOnly: true });
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (isLoading && bytes.length === 0) {
    return <BytesPageSkeleton />;
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main id="main-content" className="pb-16">
        <div className="max-w-screen-2xl mx-auto">
          {/* Header */}
          <header className="px-4 sm:px-6 lg:px-10 pt-10 sm:pt-14 pb-8 border-b border-border bg-[hsl(var(--surface))]">
            <div className="flex items-center gap-2 mb-3">
              <Radio className="h-4 w-4 text-primary fill-current" />
              <span className="overline text-primary">Live dispatches</span>
            </div>
            <h1 className="poster text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02]">
              Bytes
            </h1>
            <p className="font-serif italic text-base sm:text-lg text-muted-foreground mt-4 max-w-2xl leading-relaxed">
              Short, video-first dispatches from the newsroom floor — filed today, straight to you.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-foreground">
                {bytes.length} {bytes.length === 1 ? 'byte' : 'bytes'} today
              </span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span className="text-sm text-muted-foreground">{today}</span>
            </div>
          </header>

          {/* Grid */}
          <section className="px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
            {bytes.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center gap-4">
                <div className="h-16 w-16 rounded-full bg-secondary/60 flex items-center justify-center">
                  <Radio className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">No bytes yet today</h2>
                  <p className="font-serif italic text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
                    The newsroom is still out in the field. Check back soon — a fresh set lands every morning.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {bytes.map((byte, index) => {
                  const tone = BYTE_TONES[index % BYTE_TONES.length];
                  return (
                    <button
                      key={byte.id}
                      onClick={() => setViewerIndex(index)}
                      className="group text-left rounded-2xl overflow-hidden border border-border bg-background hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all press"
                    >
                      <div className="relative aspect-[4/5] bg-[hsl(var(--surface-2))]">
                        <ByteThumb byte={byte} toneIndex={index} />
                        <div className="absolute top-3 left-3 z-10">
                          <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-black/45 backdrop-blur border border-white/25 text-white text-[10px] font-bold uppercase tracking-widest">
                            {tone.logo === 'white' ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                            ) : null}
                            {byte.category || 'OV'}
                          </span>
                        </div>
                      </div>

                      <div className="p-4">
                        <p className="text-sm sm:text-base font-semibold leading-snug line-clamp-3 text-foreground group-hover:text-primary transition-colors">
                          {byte.text}
                        </p>
                        <div className="mt-3 flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
                          <span className="inline-flex items-center gap-1 text-primary font-semibold">
                            Play byte
                          </span>
                          {byte.articleSlug && (
                            <>
                              <span className="h-1 w-1 rounded-full bg-border" />
                              <span className="truncate">Full story</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <p className="mt-10 text-center text-xs text-muted-foreground">
              Swipe up inside a byte to move through today's dispatches.
            </p>
          </section>
        </div>
      </main>

      {viewerIndex !== null && bytes[viewerIndex] && (
        <BytesViewer
          bytes={bytes}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}

      <Footer />
    </div>
  );
};

export default BytesPage;