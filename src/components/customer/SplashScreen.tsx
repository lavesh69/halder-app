import React, { useEffect, useState } from 'react';
import { Logo } from '../common/Logo';
import { useApp } from '../../context/AppContext';

export const SplashScreen: React.FC = () => {
  const { setShowSplash, hasSeenOnboarding } = useApp();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setShowSplash(false), 200);
          return 100;
        }
        return prev + 25;
      });
    }, 180);

    return () => clearInterval(interval);
  }, [setShowSplash]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#F7F9F6] dark:bg-[#0F1411] p-5 sm:p-8 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] select-none transition-colors">
      <div className="w-full flex justify-end">
        <button
          onClick={() => setShowSplash(false)}
          className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 py-1.5 px-4 min-h-[44px] rounded-full border border-zinc-200 dark:border-zinc-800 transition-colors active:scale-95 flex items-center justify-center"
        >
          Skip
        </button>
      </div>

      <div className="flex flex-col items-center justify-center text-center space-y-6">
        <div className="relative p-6 rounded-3xl bg-white dark:bg-[#1B201D] shadow-soft-lg border border-zinc-100 dark:border-zinc-800/80 animate-float">
          <Logo size="xl" />
        </div>

        <div className="space-y-2 max-w-xs">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            Direct From Farmers
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Fresh vegetables, fruits, and food harvested at sunrise and delivered straight to your door.
          </p>
        </div>
      </div>

      {/* Footer loading bar & tag */}
      <div className="w-full max-w-xs flex flex-col items-center space-y-3">
        <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 dark:bg-emerald-400 transition-all duration-200 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
          {hasSeenOnboarding ? 'Loading fresh harvest...' : 'Preparing marketplace...'}
        </p>
      </div>
    </div>
  );
};
