"use client";

import { useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Heart,
  Bookmark,
  ChevronRight,
  ExternalLink,
  Compass,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Article } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DiscoverArticle extends Article {
  relevanceScore: number;
  discoveryContext: string;
}

interface DiscoverFeedProps {
  articles: DiscoverArticle[];
  onLike: (uri: string) => void;
  onSave: (uri: string) => void;
  onRead: (uri: string) => void;
  onOpen: (uri: string) => void;
  likedArticleUris: Set<string>;
  savedArticleUris: Set<string>;
}

export function DiscoverFeed({
  articles,
  onLike,
  onSave,
  onRead,
  onOpen,
  likedArticleUris,
  savedArticleUris,
}: DiscoverFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);

  const currentArticle = articles[currentIndex];
  const hasMore = currentIndex < articles.length - 1;

  const handleNext = useCallback(() => {
    if (hasMore) {
      setExitDirection(null);
      setCurrentIndex((prev) => prev + 1);
    }
  }, [hasMore]);

  const handleSkip = useCallback(() => {
    if (currentArticle) {
      onRead(currentArticle.uri);
      setExitDirection("left");
      setTimeout(handleNext, 200);
    }
  }, [currentArticle, onRead, handleNext]);

  const handleSaveAndNext = useCallback(() => {
    if (currentArticle) {
      onSave(currentArticle.uri);
      setExitDirection("right");
      setTimeout(handleNext, 200);
    }
  }, [currentArticle, onSave, handleNext]);

  const handleOpenArticle = useCallback(() => {
    if (currentArticle) {
      onOpen(currentArticle.uri);
      window.open(currentArticle.url, "_blank");
    }
  }, [currentArticle, onOpen]);

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <Compass className="h-16 w-16 text-amber-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No discoveries yet</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">
          Like some articles in the For You feed first. We'll use your preferences
          to find content outside your usual reading patterns.
        </p>
      </div>
    );
  }

  if (!currentArticle) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <Sparkles className="h-16 w-16 text-amber-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">All caught up!</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You've explored all the discoveries for now. Check back later for more.
        </p>
        <Button onClick={() => setCurrentIndex(0)} variant="outline">
          Start Over
        </Button>
      </div>
    );
  }

  const isLiked = likedArticleUris.has(currentArticle.uri);
  const isSaved = savedArticleUris.has(currentArticle.uri);

  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
          <Compass className="h-4 w-4" />
          <span>Discover</span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {currentIndex + 1} of {articles.length}
        </div>
      </div>

      {/* Card container with warm background */}
      <div className="flex-1 flex items-start justify-center">
        <div
          className={cn(
            "w-full max-w-lg transition-all duration-200",
            exitDirection === "left" && "translate-x-[-100%] opacity-0",
            exitDirection === "right" && "translate-x-[100%] opacity-0"
          )}
        >
          {/* Discovery context */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-t-xl px-4 py-3">
            <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
              {currentArticle.discoveryContext}
            </p>
          </div>

          {/* Main card with sepia-tinted styling */}
          <div className="bg-amber-50/50 dark:bg-gray-900 border border-amber-200 dark:border-amber-900/50 border-t-0 rounded-b-xl overflow-hidden shadow-lg">
            {/* Hero image with sepia overlay */}
            {currentArticle.imageUrl && (
              <div
                className="relative h-56 bg-amber-100 dark:bg-gray-800 cursor-pointer"
                onClick={handleOpenArticle}
              >
                <img
                  src={currentArticle.imageUrl}
                  alt=""
                  className="w-full h-full object-cover sepia-[.15]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-amber-950/60 via-transparent to-transparent" />
                <Badge className="absolute top-3 left-3 bg-amber-600 hover:bg-amber-700">
                  {currentArticle.section}
                </Badge>
              </div>
            )}

            {/* Content */}
            <div className="p-5">
              {!currentArticle.imageUrl && (
                <Badge className="mb-3 bg-amber-600 hover:bg-amber-700">
                  {currentArticle.section}
                </Badge>
              )}

              <h2
                className="font-serif text-xl md:text-2xl font-bold leading-tight mb-3 cursor-pointer hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                onClick={handleOpenArticle}
              >
                {currentArticle.title}
              </h2>

              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4">
                {currentArticle.abstract}
              </p>

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                <span>{currentArticle.byline}</span>
                <span>
                  {formatDistanceToNow(new Date(currentArticle.publishedDate), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-4 border-t border-amber-200 dark:border-amber-900/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSkip}
                  className="flex-1 border-gray-300 dark:border-gray-700"
                >
                  Skip
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onLike(currentArticle.uri)}
                  className={cn(
                    "border-gray-300 dark:border-gray-700",
                    isLiked && "text-red-500 border-red-300"
                  )}
                >
                  <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveAndNext}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Bookmark className={cn("mr-1 h-4 w-4", isSaved && "fill-current")} />
                  {isSaved ? "Saved" : "Save"}
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleOpenArticle}
                  className="border-gray-300 dark:border-gray-700"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dots indicator */}
      <div className="flex items-center justify-center gap-1.5 py-4">
        {articles.slice(0, Math.min(articles.length, 10)).map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              idx === currentIndex
                ? "bg-amber-600"
                : idx < currentIndex
                ? "bg-amber-300 dark:bg-amber-800"
                : "bg-gray-300 dark:bg-gray-700"
            )}
          />
        ))}
        {articles.length > 10 && (
          <span className="text-xs text-gray-400 ml-1">+{articles.length - 10}</span>
        )}
      </div>
    </div>
  );
}
