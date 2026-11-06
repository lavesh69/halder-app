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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#F6F4E8] dark:bg-[#061B14] p-5 sm:p-8 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] select-none transition-colors">
      <div className="w-full flex justify-end">
        <button
          onClick={() => setShowSplash(false)}
          className="text-xs font-semibold text-[#4A5B52] dark:text-[#A3B8AD] hover:text-[#17251D] dark:hover:text-white py-1.5 px-4 min-h-[44px] rounded-full border border-[#D8DFD5] dark:border-[#164635] transition-colors active:scale-95 flex items-center justify-center"
        >
          Skip
        </button>
      </div>

      <div className="flex flex-col items-center justify-center text-center space-y-6">
        <div className="relative p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0B291F] shadow-soft-lg border border-[#D8DFD5] dark:border-[#164635] animate-float max-w-xs w-full">
          <Logo size="lg" variant="vertical" showTagline />
        </div>

        <div className="space-y-2 max-w-xs">
          <h2 className="text-xl font-black text-[#0B3D2E] dark:text-[#F6F4E8] font-display">
            Farm to Market
          </h2>
          <p className="text-sm text-[#4A5B52] dark:text-[#A3B8AD] leading-relaxed">
            Fresh harvest produce directly from verified local farmers to your doorstep.
          </p>
        </div>
      </div>

      {/* Footer loading bar & tag */}
      <div className="w-full max-w-xs flex flex-col items-center space-y-3">
        <div className="w-full h-1.5 bg-[#EEF1EA] dark:bg-[#0F3327] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0B3D2E] dark:bg-[#A8E063] transition-all duration-200 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[11px] font-semibold text-[#7A8D83] dark:text-[#A3B8AD]">
          {hasSeenOnboarding ? 'Loading fresh harvest...' : 'Preparing marketplace...'}
        </p>
      </div>
    </div>
  );
};
