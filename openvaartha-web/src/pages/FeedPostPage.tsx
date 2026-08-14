import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch as useSingleDispatch, useLikeDispatch } from '@/lib/api-hooks';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FeedCard from '@/components/FeedCard';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function FeedPostPage() {
  const { postId } = useParams<{ postId: string }>();
  const { data: dispatch, isLoading, isError } = useSingleDispatch(postId);
  const { mutate: likeDispatch } = useLikeDispatch();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased">
      <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <Navbar />
      </div>
      
      <main className="flex-1 pb-16 pt-8">
        <div className="max-w-2xl mx-auto w-full px-4">
          <Link
            to="/feed"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Feed
          </Link>

          {isLoading ? (
            <div className="space-y-4">
              <div className="flex gap-4">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-[300px] w-full rounded-xl" />
                </div>
              </div>
            </div>
          ) : isError || !dispatch ? (
            <div className="text-center py-16 rounded-xl border border-border bg-card p-8">
              <h3 className="text-lg font-bold">Dispatch not found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto mb-4">
                This dispatch may have been deleted or the link is incorrect.
              </p>
              <Link to="/feed" className="text-primary hover:underline font-medium">
                Return to Feed
              </Link>
            </div>
          ) : (
            <div className="border border-border/40 rounded-xl overflow-hidden bg-card/30 shadow-sm">
              <FeedCard 
                dispatch={dispatch} 
                onLike={likeDispatch} 
              />
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
