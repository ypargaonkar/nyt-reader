"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { FeedSection } from "@/lib/types";

// Section order for navigation
const sectionOrder: FeedSection[] = [
  "home",
  "for-you",
  "saved",
  "stories",
  "politics",
  "world",
  "us",
  "opinion",
  "science",
  "technology",
  "climate",
  "business",
  "arts",
];

const sectionLabels: Record<FeedSection, string> = {
  "home": "Home",
  "for-you": "For You",
  "saved": "Saved",
  "stories": "Stories",
  "politics": "Politics",
  "world": "World",
  "us": "U.S.",
  "opinion": "Opinion",
  "science": "Science",
  "technology": "Tech",
  "climate": "Climate",
  "graphics": "Graphics",
  "investigative": "Investigative",
  "business": "Business",
  "arts": "Arts",
  "books": "Books",
  "magazine": "Magazine",
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalRef = useRef<boolean | null>(null);
  const isEdgeSwipeRef = useRef(false);

  const edgeThreshold = 30; // Pixels from edge to start swipe
  const swipeThreshold = 80; // Minimum swipe to change section

  const currentIndex = sectionOrder.indexOf(currentSection);
  const prevSection = currentIndex > 0 ? sectionOrder[currentIndex - 1] : null;
  const nextSection = currentIndex < sectionOrder.length - 1 ? sectionOrder[currentIndex + 1] : null;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const screenWidth = window.innerWidth;

      // Only activate on edge swipes
      const isLeftEdge = touchX < edgeThreshold;
      const isRightEdge = touchX > screenWidth - edgeThreshold;

      if (!isLeftEdge && !isRightEdge) {
        isEdgeSwipeRef.current = false;
        return;
      }

      isEdgeSwipeRef.current = true;
      startXRef.current = touchX;
      startYRef.current = touchY;
      isHorizontalRef.current = null;
      setIsDragging(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !isEdgeSwipeRef.current) return;

      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const diffX = touchX - startXRef.current;
      const diffY = touchY - startYRef.current;

      // Determine direction
      if (isHorizontalRef.current === null && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
        isHorizontalRef.current = Math.abs(diffX) > Math.abs(diffY);
      }

      if (isHorizontalRef.current === true) {
        e.preventDefault();

        // Determine swipe direction and limit
        if (diffX > 0 && prevSection) {
          setSwipeDirection("right");
          setSwipeOffset(Math.min(diffX * 0.4, 100));
        } else if (diffX < 0 && nextSection) {
          setSwipeDirection("left");
          setSwipeOffset(Math.max(diffX * 0.4, -100));
        } else {
          setSwipeOffset(diffX * 0.1); // Resistance when no section available
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging || !isEdgeSwipeRef.current) return;

      setIsDragging(false);

      if (Math.abs(swipeOffset) >= swipeThreshold * 0.5) {
        // Change section
        if (swipeOffset > 0 && prevSection) {
          onSectionChange(prevSection);
        } else if (swipeOffset < 0 && nextSection) {
          onSectionChange(nextSection);
        }
      }

      // Reset
      setSwipeOffset(0);
      setSwipeDirection(null);
      isEdgeSwipeRef.current = false;
      isHorizontalRef.current = null;
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    container.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [isDragging, swipeOffset, prevSection, nextSection, onSectionChange]);

  const progress = Math.min(Math.abs(swipeOffset) / swipeThreshold, 1);

  return (
    <div ref={containerRef} className="relative">
      {/* Left edge indicator (swipe right for previous) */}
      {prevSection && (
        <div
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex items-center md:hidden pointer-events-none"
          style={{
            opacity: swipeDirection === "right" ? progress : 0,
            transform: `translateX(${swipeDirection === "right" ? swipeOffset * 0.5 : -20}px) translateY(-50%)`,
            transition: isDragging ? "none" : "all 0.2s ease-out",
          }}
        >
          <div className="bg-blue-500 text-white px-3 py-4 rounded-r-xl shadow-lg flex items-center gap-2">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">{sectionLabels[prevSection]}</span>
          </div>
        </div>
      )}

      {/* Right edge indicator (swipe left for next) */}
      {nextSection && (
        <div
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center md:hidden pointer-events-none"
          style={{
            opacity: swipeDirection === "left" ? progress : 0,
            transform: `translateX(${swipeDirection === "left" ? swipeOffset * 0.5 : 20}px) translateY(-50%)`,
            transition: isDragging ? "none" : "all 0.2s ease-out",
          }}
        >
          <div className="bg-blue-500 text-white px-3 py-4 rounded-l-xl shadow-lg flex items-center gap-2">
            <span className="text-sm font-medium">{sectionLabels[nextSection]}</span>
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>
      )}

      {/* Content with subtle transform during swipe */}
      <div
        style={{
          transform: `translateX(${swipeOffset * 0.1}px)`,
          transition: isDragging ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
