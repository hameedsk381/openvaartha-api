import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { ArrowLeft } from '@/components/animate-ui/icons/arrow-left';
import { useDispatch } from '@/lib/api-hooks';
import ByteCard from '@/components/ByteCard';
import { BytesPageSkeleton } from '@/components/PageSkeletons';

/**
 * A single shared byte (see ByteCard's Share button on /bytes) — kept
 * resolvable even after the byte has rolled out of the same-day /bytes feed,
 * so a link shared yesterday still opens today.
 */
const BytePage = () => {
  const { byteId } = useParams<{ byteId: string }>();
  const navigate = useNavigate();
  const { data: byte, isLoading, isError } = useDispatch(byteId);

  if (isLoading) {
    return <BytesPageSkeleton />;
  }

  if (isError || !byte) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="font-serif italic text-muted-foreground">This byte couldn't be found.</p>
          <Link to="/bytes" className="text-sm font-semibold text-primary hover:underline underline-offset-4">
            Go to today's Bytes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      <Navbar />

      <header className="shrink-0 h-14 px-4 border-b border-border bg-background flex items-center">
        <button
          onClick={() => navigate('/bytes')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors press"
        >
          <ArrowLeft className="h-4 w-4" animateOnHover /> Today's Bytes
        </button>
      </header>

      <main className="flex-1 min-h-0">
        <ByteCard byte={byte} shareUrl={window.location.href} />
      </main>

      {/* Reserves room for Navbar's fixed mobile bottom-nav (.bottom-nav,
          sm:hidden) so it never covers the card's footer/Share button. */}
      <div className="sm:hidden shrink-0 h-[calc(4rem+env(safe-area-inset-bottom))]" />
    </div>
  );
};

export default BytePage;
