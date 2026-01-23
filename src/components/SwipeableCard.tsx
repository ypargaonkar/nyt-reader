"use client";

import { useState, useRef, useCallback } from "react";
import { Heart, X, Bookmark } from "lucide-react";

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftLabel?: string;
  rightLabel?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftColor?: string;
  rightColor?: string;
  disabled?: boolean;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftLabel = "Dismiss",
  rightLabel = "Like",
  leftIcon = <X className="w-6 h-6" />,
  rightIcon = <Heart className="w-6 h-6" />,
  leftColor = "bg-orange-500",
  rightColor = "bg-green-500",
  disabled = false,
}: SwipeableCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  const threshold = 100; // Minimum swipe distance to trigger action
  const maxSwipe = 150; // Maximum visual swipe distance

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isAnimating) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isHorizontalSwipeRef.current = null;
    setIsDragging(true);
  }, [disabled, isAnimating]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || disabled || isAnimating) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startXRef.current;
    const diffY = currentY - startYRef.current;

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        isHorizontalSwipeRef.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    // Only handle horizontal swipes
    if (isHorizontalSwipeRef.current === true) {
      e.preventDefault();
      // Apply resistance at edges
      const resistance = 0.5;
      const newOffset = Math.max(-maxSwipe, Math.min(maxSwipe, diffX * resistance));
      setOffsetX(newOffset);
    }
  }, [isDragging, disabled, isAnimating]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    if (Math.abs(offsetX) >= threshold * 0.5) {
      // Trigger action
      setIsAnimating(true);
      const direction = offsetX > 0 ? 1 : -1;
      const finalOffset = direction * 400; // Animate off screen

      setOffsetX(finalOffset);

      setTimeout(() => {
        if (direction > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (direction < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
        setOffsetX(0);
        setIsAnimating(false);
      }, 200);
    } else {
      // Snap back
      setOffsetX(0);
    }

    isHorizontalSwipeRef.current = null;
  }, [isDragging, offsetX, onSwipeLeft, onSwipeRight]);

  const progress = Math.min(Math.abs(offsetX) / threshold, 1);
  const isSwipingRight = offsetX > 0;
  const isSwipingLeft = offsetX < 0;

  return (
    <div className="relative overflow-hidden rounded-xl md:overflow-visible">
      {/* Background indicators - only visible on mobile */}
      <div className="absolute inset-0 flex md:hidden">
        {/* Right swipe indicator (like) */}
        <div
          className={`absolute inset-y-0 left-0 flex items-center justify-start pl-4 transition-opacity ${rightColor}`}
          style={{
            width: Math.max(0, offsetX),
            opacity: isSwipingRight ? progress : 0,
          }}
        >
          <div className="flex flex-col items-center text-white">
            {rightIcon}
            <span className="text-xs font-medium mt-1">{rightLabel}</span>
          </div>
        </div>

        {/* Left swipe indicator (dismiss) */}
        <div
          className={`absolute inset-y-0 right-0 flex items-center justify-end pr-4 transition-opacity ${leftColor}`}
          style={{
            width: Math.max(0, -offsetX),
            opacity: isSwipingLeft ? progress : 0,
          }}
        >
          <div className="flex flex-col items-center text-white">
            {leftIcon}
            <span className="text-xs font-medium mt-1">{leftLabel}</span>
          </div>
        </div>
      </div>

      {/* Card content */}
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative bg-white dark:bg-gray-900 touch-pan-y"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </div>

      {/* Swipe hint overlay - shows on first few swipes */}
      {isDragging && Math.abs(offsetX) > 20 && (
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center md:hidden"
          style={{ opacity: progress * 0.3 }}
        >
          <div className={`px-4 py-2 rounded-full text-white font-medium ${
            isSwipingRight ? rightColor : leftColor
          }`}>
            {isSwipingRight ? rightLabel : leftLabel}
          </div>
        </div>
      )}
    </div>
  );
}

// Pre-configured swipe card for articles
export function SwipeableArticleCard({
  children,
  onLike,
  onDismiss,
  onSave,
}: {
  children: React.ReactNode;
  onLike: () => void;
  onDismiss: () => void;
  onSave?: () => void;
}) {
  return (
    <SwipeableCard
      onSwipeRight={onLike}
      onSwipeLeft={onDismiss}
      rightLabel="Like"
      leftLabel="Dismiss"
      rightIcon={<Heart className="w-6 h-6" />}
      leftIcon={<X className="w-6 h-6" />}
      rightColor="bg-green-500"
      leftColor="bg-orange-500"
    >
      {children}
    </SwipeableCard>
  );
}
