import { useState, useEffect, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  pullThreshold?: number;
  maxPull?: number;
}

export function usePullToRefresh({
  onRefresh,
  pullThreshold = 65,
  maxPull = 95,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only initiate pull when scroll is at top
      if (window.scrollY <= 4) {
        startXRef.current = e.touches[0].clientX;
        startYRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshing) return;
      if (window.scrollY > 4) {
        isPullingRef.current = false;
        setPullDistance(0);
        return;
      }

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = currentX - startXRef.current;
      const diffY = currentY - startYRef.current;

      // If user is swiping horizontally (e.g. across category or product carousels), cancel vertical pull
      if (Math.abs(diffX) > Math.abs(diffY)) {
        isPullingRef.current = false;
        setPullDistance(0);
        return;
      }

      if (diffY > 0) {
        // Elastic resistance damping
        const damped = Math.min(maxPull, diffY * 0.42);
        setPullDistance(damped);
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current) return;
      isPullingRef.current = false;

      if (pullDistance >= pullThreshold && !isRefreshing) {
        try {
          if ('vibrate' in navigator) {
            navigator.vibrate(15);
          }
        } catch {}

        setIsRefreshing(true);
        setPullDistance(52); // Keep pinned during refresh spinner
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing, onRefresh, pullThreshold, maxPull]);

  return { pullDistance, isRefreshing };
}
