"use client";

import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Heart,
  Bookmark,
  Newspaper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StoryCluster, Article } from "@/lib/types";
import { cn } from "@/lib/utils";

// Upscale NYT image URLs to high resolution
function getHighResImageUrl(url: string | null): string | null {
  if (!url) return null;

  const sizeSuffixes = [
    "thumbStandard",
    "thumbLarge",
    "mediumThreeByTwo210",
    "mediumThreeByTwo440",
    "articleInline",
    "articleLarge",
    "popup",
  ];

  for (const suffix of sizeSuffixes) {
    if (url.includes(`-${suffix}.`) || url.includes(`-${suffix}-`)) {
      return url.replace(`-${suffix}`, "-superJumbo");
    }
  }

  return url;
}

interface MagazineStoryCardProps {
  cluster: StoryCluster;
  onLike?: (uri: string) => void;
  onSave?: (uri: string) => void;
  onRead?: (uri: string) => void;
  likedArticleUris?: Set<string>;
  savedArticleUris?: Set<string>;
}

export function MagazineStoryCard({
  cluster,
  onLike,
  onSave,
  onRead,
  likedArticleUris = new Set(),
  savedArticleUris = new Set(),
}: MagazineStoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [useOriginal, setUseOriginal] = useState(false);

  const timespanStart = new Date(cluster.timespan.start);
  const timespanEnd = new Date(cluster.timespan.end);
  const daysDiff = Math.ceil(
    (timespanEnd.getTime() - timespanStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Get the hero image from the first article with an image
  const rawHeroImage = cluster.articles.find((a) => a.imageUrl)?.imageUrl ?? null;
  const highResImage = getHighResImageUrl(rawHeroImage);

  // Use original if high-res failed, or null if both failed
  const heroImage = imageError ? null : (useOriginal ? rawHeroImage : highResImage);

  // Handle image load error - first try original, then give up
  const handleImageError = () => {
    if (!useOriginal && rawHeroImage !== highResImage) {
      // First failure: try original image
      setUseOriginal(true);
    } else {
      // Second failure: show placeholder
      setImageError(true);
    }
  };

  // Get articles sorted by date (newest first)
  const sortedArticles = [...cluster.articles].sort(
    (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
  );

  const latestArticle = sortedArticles[0];

  return (
    <div className="mb-8">
      {/* Hero section - full bleed */}
      <div
        className="relative cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        {heroImage ? (
          <div className="relative aspect-[16/10] md:aspect-[21/9] overflow-hidden rounded-xl">
            <img
              src={heroImage}
              alt={cluster.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={handleImageError}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

            {/* Content overlay */}
            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
              {/* Meta badges */}
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-blue-600/90 text-white border-0">
                  DEVELOPING
                </Badge>
                <span className="text-white/80 text-sm">
                  {cluster.articles.length} articles
                </span>
                {daysDiff > 1 && (
                  <span className="text-white/80 text-sm">
                    {daysDiff} days
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="font-serif text-2xl md:text-4xl font-bold text-white leading-tight mb-3">
                {cluster.title}
              </h2>

              {/* Summary */}
              {cluster.summary && (
                <p className="text-white/90 text-sm md:text-base leading-relaxed mb-4 max-w-3xl line-clamp-3">
                  {cluster.summary}
                </p>
              )}

              {/* CTA */}
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                  }}
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-1" />
                      Hide timeline
                    </>
                  ) : (
                    <>
                      Read full story
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>

                {latestArticle && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(latestArticle.url, "_blank");
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Latest article
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Fallback for no image or failed image
          <div className="relative aspect-[16/10] md:aspect-[21/9] overflow-hidden rounded-xl bg-gradient-to-br from-gray-800 to-gray-900">
            {/* Centered icon */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <Newspaper className="w-32 h-32 text-gray-500" />
            </div>

            {/* Content overlay */}
            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
              {/* Meta badges */}
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-blue-600/90 text-white border-0">
                  DEVELOPING
                </Badge>
                <span className="text-white/80 text-sm">
                  {cluster.articles.length} articles
                </span>
                {daysDiff > 1 && (
                  <span className="text-white/80 text-sm">
                    {daysDiff} days
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="font-serif text-2xl md:text-4xl font-bold text-white leading-tight mb-3">
                {cluster.title}
              </h2>

              {/* Summary */}
              {cluster.summary && (
                <p className="text-white/90 text-sm md:text-base leading-relaxed mb-4 max-w-3xl line-clamp-3">
                  {cluster.summary}
                </p>
              )}

              {/* CTA */}
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                  }}
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-1" />
                      Hide timeline
                    </>
                  ) : (
                    <>
                      Read full story
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>

                {latestArticle && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(latestArticle.url, "_blank");
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Latest article
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expanded timeline */}
      {expanded && (
        <div className="mt-6 pl-4 border-l-2 border-blue-200 dark:border-blue-800 space-y-4">
          {sortedArticles.map((article, index) => (
            <TimelineArticle
              key={article.uri}
              article={article}
              isLatest={index === 0}
              onLike={onLike}
              onSave={onSave}
              onRead={onRead}
              isLiked={likedArticleUris.has(article.uri)}
              isSaved={savedArticleUris.has(article.uri)}
            />
          ))}

          {/* Keywords at bottom */}
          {cluster.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 pl-4">
              {cluster.keywords.slice(0, 5).map((keyword) => (
                <span
                  key={keyword}
                  className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Timeline article item
function TimelineArticle({
  article,
  isLatest,
  onLike,
  onSave,
  onRead,
  isLiked,
  isSaved,
}: {
  article: Article;
  isLatest: boolean;
  onLike?: (uri: string) => void;
  onSave?: (uri: string) => void;
  onRead?: (uri: string) => void;
  isLiked: boolean;
  isSaved: boolean;
}) {
  return (
    <div className="relative pl-6">
      {/* Timeline dot */}
      <div
        className={cn(
          "absolute left-0 top-2 w-3 h-3 rounded-full -translate-x-[7px] border-2",
          isLatest
            ? "bg-blue-500 border-blue-500"
            : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
        )}
      />

      <div
        className={cn(
          "p-4 rounded-lg transition-colors",
          "hover:bg-gray-50 dark:hover:bg-gray-800/50",
          isLatest && "bg-blue-50/50 dark:bg-blue-900/10"
        )}
      >
        {/* Date and latest badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {format(new Date(article.publishedDate), "MMM d, h:mm a")}
          </span>
          {isLatest && (
            <Badge variant="secondary" className="text-[10px] py-0 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              Latest
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3
          className="font-medium text-sm md:text-base leading-snug mb-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          onClick={() => window.open(article.url, "_blank")}
        >
          {article.title}
        </h3>

        {/* Byline */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {article.byline}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onLike?.(article.uri)}
            className={cn(
              "p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
              isLiked && "text-red-500"
            )}
          >
            <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
          </button>
          <button
            onClick={() => onSave?.(article.uri)}
            className={cn(
              "p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
              isSaved && "text-blue-500"
            )}
          >
            <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
          </button>
          <button
            onClick={() => onRead?.(article.uri)}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
            title="Mark as read"
          >
            <Newspaper className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.open(article.url, "_blank")}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 ml-auto"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
