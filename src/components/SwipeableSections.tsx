"use client";

import { useRef, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { FeedSection, MainTab } from "@/lib/types";

// Only swipe between main tabs
const sectionOrder: MainTab[] = [
  "stories",
  "for-you",
  "discover",
  "saved",
];

const sectionLabels: Record<MainTab, string> = {
  "stories": "Stories",
  "for-you": "For You",
  "discover": "Discover",
  "saved": "Saved",
};

interface SwipeableSectionsProps {
  children: React.ReactNode;
  currentSection: FeedSection;
  onSectionChange: (section: FeedSection) => void;
}

export function SwipeableSections({
  children,
  currentSection,
  onSectionChange,
}: SwipeableSectionsProps) {
  const [indicator, setIndicator] = useState<{
    direction: "left" | "right";
    section: MainTab;
    progress: number;
  } | null>(null);

  const startX = useRef(0);
  const startY = useRef(0);
  const isTracking = useRef(false);
  const direction = useRef<"horizontal" | "vertical" | null>(null);

  // Only allow swiping between main tabs
  const isMainTab = sectionOrder.includes(currentSection as MainTab);
  const currentIndex = isMainTab ? sectionOrder.indexOf(currentSection as MainTab) : -1;
  const prevSection = currentIndex > 0 ? sectionOrder[currentIndex - 1] : null;
  const nextSection = currentIndex >= 0 && currentIndex < sectionOrder.length - 1 ? sectionOrder[currentIndex + 1] : null;

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const screenWidth = window.innerWidth;

      // Only start tracking if touch begins near edges (50px zone)
      const edgeZone = 50;
      const isNearLeftEdge = touch.clientX < edgeZone;
      const isNearRightEdge = touch.clientX > screenWidth - edgeZone;

      if (isNearLeftEdge || isNearRightEdge) {
        startX.current = touch.clientX;
        startY.current = touch.clientY;
        isTracking.current = true;
        direction.current = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTracking.current) return;

      const touch = e.touches[0];
      const diffX = touch.clientX - startX.current;
      const diffY = touch.clientY - startY.current;

      // Determine direction on first significant movement
      if (direction.current === null && (Math.abs(diffX) > 15 || Math.abs(diffY) > 15)) {
        direction.current = Math.abs(diffX) > Math.abs(diffY) ? "horizontal" : "vertical";
      }

      // Only handle horizontal swipes
      if (direction.current === "horizontal") {
        e.preventDefault();

        const progress = Math.min(Math.abs(diffX) / 100, 1);

        if (diffX > 20 && prevSection) {
          setIndicator({ direction: "right", section: prevSection, progress });
        } else if (diffX < -20 && nextSection) {
          setIndicator({ direction: "left", section: nextSection, progress });
        } else {
          setIndicator(null);
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isTracking.current) return;

      if (indicator && indicator.progress > 0.5) {
        onSectionChange(indicator.section);
      }

      isTracking.current = false;
      direction.current = null;
      setIndicator(null);
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    document.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [indicator, prevSection, nextSection, onSectionChange]);

  return (
    <div className="relative">
      {/* Section change indicator */}
      {indicator && (
        <div
          className={`fixed top-1/2 -translate-y-1/2 z-50 md:hidden transition-transform ${
            indicator.direction === "right" ? "left-0" : "right-0"
          }`}
          style={{
            transform: `translateY(-50%) translateX(${
              indicator.direction === "right"
                ? `${-100 + indicator.progress * 100}%`
                : `${100 - indicator.progress * 100}%`
            })`,
          }}
        >
          <div
            className={`bg-blue-600 text-white px-4 py-3 shadow-xl flex items-center gap-2 ${
              indicator.direction === "right" ? "rounded-r-2xl" : "rounded-l-2xl"
            }`}
          >
            {indicator.direction === "right" && <ChevronLeft className="w-5 h-5" />}
            <span className="font-semibold text-sm">{sectionLabels[indicator.section]}</span>
            {indicator.direction === "left" && <ChevronRight className="w-5 h-5" />}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
