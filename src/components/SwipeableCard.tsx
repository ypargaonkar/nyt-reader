"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Heart, X } from "lucide-react";

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
  const cardRef = useRef<HTMLDivElement>(null);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const isHorizontalRef = useRef<boolean | null>(null);
  const hasMoved = useRef(false);

  const threshold = 80;
  const maxSwipe = 120;

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (disabled || isAnimating) return;

      startXRef.current = e.touches[0].clientX;
      startYRef.current = e.touches[0].clientY;
      currentXRef.current = startXRef.current;
      isHorizontalRef.current = null;
      hasMoved.current = false;
      setIsDragging(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || disabled || isAnimating) return;

      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const diffX = touchX - startXRef.current;
      const diffY = touchY - startYRef.current;

      // Determine direction on first significant movement
      if (isHorizontalRef.current === null && (Math.abs(diffX) > 8 || Math.abs(diffY) > 8)) {
        isHorizontalRef.current = Math.abs(diffX) > Math.abs(diffY);
      }

      // Only handle horizontal swipes
      if (isHorizontalRef.current === true) {
        e.preventDefault(); // This works with passive: false
        hasMoved.current = true;
        currentXRef.current = touchX;

        const resistance = 0.6;
        const newOffset = Math.max(-maxSwipe, Math.min(maxSwipe, diffX * resistance));
        setOffsetX(newOffset);
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;
      setIsDragging(false);

      const finalOffset = offsetX;

      if (Math.abs(finalOffset) >= threshold * 0.6 && hasMoved.current) {
        // Trigger action
        setIsAnimating(true);
        const direction = finalOffset > 0 ? 1 : -1;
        setOffsetX(direction * 300);

        setTimeout(() => {
          if (direction > 0 && onSwipeRight) {
            onSwipeRight();
          } else if (direction < 0 && onSwipeLeft) {
            onSwipeLeft();
          }
          setOffsetX(0);
          setIsAnimating(false);
        }, 150);
      } else {
        setOffsetX(0);
      }

      isHorizontalRef.current = null;
      hasMoved.current = false;
    };

    // Use passive: false to allow preventDefault on touchmove
    card.addEventListener("touchstart", handleTouchStart, { passive: true });
    card.addEventListener("touchmove", handleTouchMove, { passive: false });
    card.addEventListener("touchend", handleTouchEnd, { passive: true });
    card.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      card.removeEventListener("touchstart", handleTouchStart);
      card.removeEventListener("touchmove", handleTouchMove);
      card.removeEventListener("touchend", handleTouchEnd);
      card.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [isDragging, isAnimating, disabled, offsetX, onSwipeLeft, onSwipeRight]);

  const progress = Math.min(Math.abs(offsetX) / threshold, 1);
  const isSwipingRight = offsetX > 0;
  const isSwipingLeft = offsetX < 0;

  // Prevent click when swiping
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (hasMoved.current || Math.abs(offsetX) > 5) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [offsetX]);

  return (
    <div className="relative overflow-hidden rounded-xl md:rounded-xl">
      {/* Background indicators - mobile only */}
      <div className="absolute inset-0 md:hidden pointer-events-none">
        {/* Right swipe (like) - green */}
        <div
          className={`absolute inset-y-0 left-0 flex items-center justify-center ${rightColor}`}
          style={{
            width: `${Math.max(0, offsetX)}px`,
            opacity: isSwipingRight ? Math.min(progress * 1.5, 1) : 0,
          }}
        >
          <div className="flex flex-col items-center text-white pl-4">
            {rightIcon}
            <span className="text-xs font-bold mt-1">{rightLabel}</span>
          </div>
        </div>

        {/* Left swipe (dismiss) - orange */}
        <div
          className={`absolute inset-y-0 right-0 flex items-center justify-center ${leftColor}`}
          style={{
            width: `${Math.max(0, -offsetX)}px`,
            opacity: isSwipingLeft ? Math.min(progress * 1.5, 1) : 0,
          }}
        >
          <div className="flex flex-col items-center text-white pr-4">
            {leftIcon}
            <span className="text-xs font-bold mt-1">{leftLabel}</span>
          </div>
        </div>
      </div>

      {/* Card content */}
      <div
        ref={cardRef}
        onClick={handleClick}
        className="relative bg-white dark:bg-gray-900"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
