import React from 'react';

interface ListingCardSkeletonProps {
  variant?: 'compact-grid' | 'vertical-feed' | 'horizontal';
  count?: number;
}

export const ListingCardSkeleton: React.FC<ListingCardSkeletonProps> = ({
  variant = 'compact-grid',
  count = 1,
}) => {
  const items = Array.from({ length: count });

  if (variant === 'horizontal') {
    return (
      <>
        {items.map((_, i) => (
          <div
            key={i}
            className="shrink-0 w-64 p-3 bg-white dark:bg-[#181F1A] rounded-2xl border border-[#E5EBE6] dark:border-[#29352D] shadow-soft animate-pulse flex flex-col justify-between"
          >
            <div className="w-full aspect-[4/3] rounded-xl bg-zinc-200 dark:bg-zinc-800 mb-2.5" />
            <div className="space-y-2">
              <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
              <div className="h-3.5 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
              <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
            </div>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#E5EBE6] dark:border-[#29352D]">
              <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-7 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
            </div>
          </div>
        ))}
      </>
    );
  }

  if (variant === 'vertical-feed') {
    return (
      <>
        {items.map((_, i) => (
          <div
            key={i}
            className="p-3.5 bg-white dark:bg-[#181F1A] rounded-2xl border border-[#E5EBE6] dark:border-[#29352D] shadow-soft flex flex-col sm:flex-row gap-3.5 relative overflow-hidden animate-pulse"
          >
            <div className="w-full sm:w-48 aspect-[4/3] rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
            <div className="flex-1 flex flex-col justify-between space-y-3 min-w-0">
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="h-2.5 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
                    <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-700 rounded-md" />
                  </div>
                  <div className="h-5 w-24 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
                </div>
                <div className="h-4 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
                <div className="flex items-center gap-2">
                  <div className="h-3 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
                </div>
                <div className="space-y-1">
                  <div className="h-2.5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="flex gap-2">
                  <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                  <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </>
    );
  }

  // Compact Grid variant (default)
  return (
    <>
      {items.map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#181F1A] rounded-2xl border border-[#E5EBE6] dark:border-[#29352D] shadow-soft flex flex-col overflow-hidden relative animate-pulse"
        >
          <div className="w-full aspect-[4/3] bg-zinc-200 dark:bg-zinc-800" />
          <div className="p-3 flex flex-col justify-between flex-1 space-y-2">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
                <div className="h-3 w-10 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
              </div>
              <div className="h-3.5 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
              <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
            </div>
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex justify-between items-center">
              <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
              <div className="flex gap-1">
                <div className="w-6 h-6 rounded-md bg-zinc-200 dark:bg-zinc-800" />
                <div className="w-6 h-6 rounded-md bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
