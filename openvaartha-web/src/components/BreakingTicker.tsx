import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDispatches } from '@/lib/api-hooks';

export default function BreakingTicker() {
  const { data: dispatches = [] } = useDispatches(1);
  const update = dispatches[0];
  if (!update) return null;

  return (
    <aside aria-label="Latest dispatch" className="border-t border-[#e4d6ca] bg-[#fdf8f1] text-[#382729] dark:border-[#493638] dark:bg-[#1d1617] dark:text-[#f5e6de]">
      <div className="mx-auto flex max-w-screen-2xl items-center gap-2 px-3 sm:gap-4 sm:px-6 lg:px-10">
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-[#782a30] dark:text-[#f4a8a0]">
          <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
          Just in
        </span>
        <Link
          to={update.articleSlug ? `/article/${update.articleSlug}` : `/feed/${update.id}`}
          className="flex min-h-11 min-w-0 flex-1 items-center rounded-sm text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        >
          <span className="truncate">{update.text}</span>
        </Link>
        <Link to="/feed" className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-sm text-xs font-semibold text-[#782a30] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary dark:text-[#f4a8a0]">
          <span className="hidden sm:inline">All updates</span>
          <span className="sm:hidden">Updates</span>
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
