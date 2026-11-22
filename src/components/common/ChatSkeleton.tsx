import React from 'react';

interface ChatSkeletonProps {
  count?: number;
}

export const ChatSkeleton: React.FC<ChatSkeletonProps> = ({ count = 4 }) => {
  return (
    <div className="space-y-2.5 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-3.5 bg-white dark:bg-[#1B201D] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 flex items-center gap-3"
        >
          {/* Avatar shimmer */}
          <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />

          {/* Conversation details shimmer */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
              <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
            <div className="h-3 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};
