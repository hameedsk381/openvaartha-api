import { useState, useRef, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BreakingTicker from '../components/BreakingTicker';
import Footer from '@/components/Footer';

// Extracted Home Components
import HeroClassic from '@/components/home/HeroClassic';
import CategoryStrip from '@/components/home/CategoryStrip';
import EditorPicks from '@/components/home/EditorPicks';
import MainFeed from '@/components/home/MainFeed';
import TrendingSidebar from '@/components/home/TrendingSidebar';

import {
  useArticles,
  useTrendingArticles,
  useForYouArticles,
  useEditorPicks,
  useCategories,
} from '@/lib/api-hooks';

export default function Index() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCat = searchParams.get('category') || 'All';
  const [switching, setSwitching] = useState(false);
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: categories = [] } = useCategories();

  const selectedCategoryObj = useMemo(() => {
    return categories.find(
      c => c.name.toLowerCase() === selectedCat.toLowerCase()
    );
  }, [categories, selectedCat]);

  const [limit, setLimit] = useState(40);

  useEffect(() => {
    setLimit(40);
  }, [selectedCat]);

  const [feedTab, setFeedTab] = useState<'latest' | 'forYou'>('latest');
  const { data: articlesData = [], isFetching } = useArticles({
    category: selectedCategoryObj?.id,
    limit
  });

  const { data: trendingData = [] } = useTrendingArticles(8);
  const { data: forYouData = [] } = useForYouArticles(25);
  const { data: editorPicks = [] } = useEditorPicks(6);

  // setCategory function is not used directly in this refactored component, 
  // but if Navbar uses query params, we are good.

  const displayCategoryName = selectedCategoryObj ? selectedCategoryObj.name : selectedCat;

  const filtered = articlesData;
  const isFiltered = selectedCat.toLowerCase() !== 'all';

  const feed = feedTab === 'forYou' && !isFiltered ? forYouData : filtered.slice(5);
  const trending = useMemo(() => trendingData.slice(0, 8), [trendingData]);
  const picks = useMemo(() => editorPicks.slice(0, 6), [editorPicks]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-50 bg-background border-b border-border">
        <Navbar isInsideStack />
        <BreakingTicker />
      </div>

      <main id="main-content" className="pb-safe pt-0">
        <div className="max-w-screen-2xl mx-auto">

          {isFiltered && (
            <div className="px-4 sm:px-6 lg:px-10 py-6 border-b border-border">
              <span className="overline text-primary">Section</span>
              <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight mt-1">
                {displayCategoryName}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {filtered.length} article{filtered.length !== 1 ? 's' : ''} in this section
              </p>
            </div>
          )}

          {/* Classic Hero Section */}
          <HeroClassic articles={filtered.slice(0, 5)} />

          {/* Category Quick Strips */}
          {!isFiltered && categories.length > 0 && (
            <section className="border-b border-border px-4 sm:px-6 lg:px-10 divide-y divide-border">
              {categories.slice(0, 6).map((cat) => (
                <CategoryStrip key={cat.id} category={cat} />
              ))}
            </section>
          )}

          {/* Editor's Picks */}
          {!switching && !isFiltered && (
            <EditorPicks picks={picks} />
          )}

          {/* Main Feed + Trending Sidebar */}
          <section className="grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-8 lg:border-r lg:border-border">
              <MainFeed 
                feed={feed}
                switching={switching}
                isFiltered={isFiltered}
                displayCategoryName={displayCategoryName}
                feedTab={feedTab}
                setFeedTab={setFeedTab}
                articlesDataLength={articlesData.length}
                limit={limit}
                setLimit={setLimit}
                isFetching={isFetching}
              />
            </div>

            <aside className="lg:col-span-4">
              <TrendingSidebar trending={trending} />
            </aside>
          </section>

          <Footer />
        </div>
      </main>
    </div>
  );
}
