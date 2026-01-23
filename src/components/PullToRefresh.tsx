"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

export function PullToRefresh({ onRefresh, children, disabled }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);

  const threshold = 80; // Pull distance to trigger refresh
  const maxPull = 120; // Maximum pull distance

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;

    // Only enable pull-to-refresh when at top of page
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 5) return;

    startYRef.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 5) {
      setPullDistance(0);
      return;
    }

    currentYRef.current = e.touches[0].clientY;
    const diff = currentYRef.current - startYRef.current;

    if (diff > 0) {
      // Apply resistance as pull increases
      const resistance = 0.4;
      const distance = Math.min(diff * resistance, maxPull);
      setPullDistance(distance);

      // Prevent default scroll when pulling
      if (distance > 10) {
        e.preventDefault();
      }
    }
  }, [isPulling, disabled, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    setIsPulling(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.6); // Keep some visual feedback during refresh

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use passive: false for touchmove to allow preventDefault
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 180;
  const scale = 0.5 + progress * 0.5;

  return (
    <div ref={containerRef} className="relative min-h-screen">
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex justify-center pointer-events-none transition-opacity duration-200 md:hidden"
        style={{
          top: pullDistance - 40,
          opacity: pullDistance > 10 ? 1 : 0,
        }}
      >
        <div
          className={`p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg ${
            isRefreshing ? "animate-spin" : ""
          }`}
          style={{
            transform: `rotate(${rotation}deg) scale(${scale})`,
            transition: isPulling ? "none" : "transform 0.2s ease-out",
          }}
        >
          <RefreshCw
            className={`h-5 w-5 ${
              progress >= 1 ? "text-blue-600" : "text-gray-400"
            }`}
          />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
