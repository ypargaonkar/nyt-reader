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
  Check,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StoryCluster, Article } from "@/lib/types";
import { cn, openArticleLink } from "@/lib/utils";

// NYT image size suffixes from largest to smallest
const IMAGE_SIZES = [
  "superJumbo",
  "jumbo",
  "videoSixteenByNineJumbo",
  "facebookJumbo",
  "articleLarge",
  "mediumThreeByTwo440",
  "mediumThreeByTwo210",
  "thumbLarge",
  "thumbStandard",
] as const;

// Known size suffixes that appear in URLs
const KNOWN_SUFFIXES = [
  "thumbStandard",
  "thumbLarge",
  "mediumThreeByTwo210",
  "mediumThreeByTwo440",
  "articleInline",
  "articleLarge",
  "popup",
  "superJumbo",
  "jumbo",
  "videoSixteenByNineJumbo",
  "facebookJumbo",
];

// Get image URL with specific size
function getImageUrlWithSize(url: string | null, targetSize: string): string | null {
  if (!url) return null;

  for (const suffix of KNOWN_SUFFIXES) {
    if (url.includes(`-${suffix}.`) || url.includes(`-${suffix}-`)) {
      return url.replace(`-${suffix}`, `-${targetSize}`);
    }
  }

  return url;
}

interface MagazineStoryCardProps {
  cluster: StoryCluster;
  onLike?: (uri: string) => void;
  onSave?: (uri: string) => void;
  onRead?: (uri: string) => void;
  onFollowJournalist?: (name: string) => void;
  onUnfollowJournalist?: (name: string) => void;
  likedArticleUris?: Set<string>;
  savedArticleUris?: Set<string>;
  readArticleUris?: Set<string>;
  followedJournalists?: Set<string>;
}

export function MagazineStoryCard({
  cluster,
  onLike,
  onSave,
  onRead,
  onFollowJournalist,
  onUnfollowJournalist,
  likedArticleUris = new Set(),
  savedArticleUris = new Set(),
  readArticleUris = new Set(),
  followedJournalists = new Set(),
}: MagazineStoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  // Track which article's image we're trying (index into articlesWithImages)
  const [articleIndex, setArticleIndex] = useState(0);
  // Track which size we're trying for the current article (index into IMAGE_SIZES)
  const [sizeIndex, setSizeIndex] = useState(0);

  const timespanStart = new Date(cluster.timespan.start);
  const timespanEnd = new Date(cluster.timespan.end);
  const daysDiff = Math.ceil(
    (timespanEnd.getTime() - timespanStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Get all articles that have images
  const articlesWithImages = cluster.articles.filter((a) => a.imageUrl);

  // Get current article and its raw image URL
  const currentArticle = articlesWithImages[articleIndex];
  const rawImage = currentArticle?.imageUrl ?? null;

  // Get current image URL with the current size from cascade
  const currentSize = IMAGE_SIZES[sizeIndex];
  const heroImage = rawImage ? getImageUrlWithSize(rawImage, currentSize) : null;

  // Are we using a fallback image (not the first article)?
  const isUsingFallbackImage = articleIndex > 0 && heroImage;

  // No images available at all (exhausted all articles)
  const noImagesAvailable = articlesWithImages.length === 0 || articleIndex >= articlesWithImages.length;

  // Handle image load error - cascade through sizes, then articles
  const handleImageError = () => {
    if (sizeIndex < IMAGE_SIZES.length - 1) {
      // Try next smaller size for current article
      setSizeIndex((prev) => prev + 1);
    } else {
      // All sizes failed for this article, try next article from the beginning
      setSizeIndex(0);
      setArticleIndex((prev) => prev + 1);
    }
  };

  // Get articles sorted by date (newest first)
  const sortedArticles = [...cluster.articles].sort(
    (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
  );

  const latestArticle = sortedArticles[0];

  // Check if any article in the cluster is a live blog
  const hasLiveBlog = cluster.articles.some((a) => a.isLiveBlog);

  // Check if the live blog was updated recently (within last 2 hours)
  const liveBlogArticle = cluster.articles.find((a) => a.isLiveBlog);
  const isActivelyUpdating = liveBlogArticle
    ? (Date.now() - new Date(liveBlogArticle.updatedDate).getTime()) < 2 * 60 * 60 * 1000
    : false;

  // Shared content component to avoid duplication
  const CardContent = ({ isDark = true }: { isDark?: boolean }) => (
    <>
      {/* Meta badges */}
      <div className="flex items-center gap-2 mb-3">
        {hasLiveBlog ? (
          <Badge className={cn(
            "border-0 gap-1.5",
            isDark ? "bg-red-600/90 text-white" : "bg-red-600 text-white"
          )}>
            {isActivelyUpdating && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
            )}
            LIVE
          </Badge>
        ) : (
          <Badge className={cn(
            "border-0",
            isDark ? "bg-blue-600/90 text-white" : "bg-blue-600 text-white"
          )}>
            DEVELOPING
          </Badge>
        )}
        <span className={isDark ? "text-white/80 text-sm" : "text-gray-500 dark:text-gray-400 text-sm"}>
          {cluster.articles.length} articles
        </span>
        {daysDiff > 1 && (
          <span className={isDark ? "text-white/80 text-sm" : "text-gray-500 dark:text-gray-400 text-sm"}>
            {daysDiff} days
          </span>
        )}
      </div>

      {/* Title */}
      <h2 className={cn(
        "font-serif text-2xl md:text-4xl font-bold leading-tight mb-3",
        isDark ? "text-white" : "text-gray-900 dark:text-white"
      )}>
        {cluster.title}
      </h2>

      {/* Summary */}
      {cluster.summary && (
        <p className={cn(
          "text-sm md:text-base leading-relaxed mb-4 line-clamp-3",
          isDark ? "text-white/90 max-w-3xl" : "text-gray-600 dark:text-gray-300"
        )}>
          {cluster.summary}
        </p>
      )}

      {/* CTA */}
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          className={cn(
            isDark
              ? "bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
              : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          )}
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
            className={isDark
              ? "text-white/80 hover:text-white hover:bg-white/10"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }
            onClick={(e) => {
              e.stopPropagation();
              openArticleLink(latestArticle.url);
            }}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Latest article
          </Button>
        )}
      </div>
    </>
  );

  return (
    <div className="mb-8">
      {/* Hero section */}
      <div
        className="relative cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Case 1: Full-bleed hero image (primary image works) */}
        {heroImage && !isUsingFallbackImage && (
          <div className="relative aspect-[16/10] md:aspect-[21/9] overflow-hidden rounded-xl">
            <img
              src={heroImage}
              alt={cluster.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={handleImageError}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
              <CardContent isDark />
            </div>
          </div>
        )}

        {/* Case 2: Side-by-side layout (using fallback image from another article) */}
        {heroImage && isUsingFallbackImage && (
          <div className="flex flex-col md:flex-row rounded-xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg">
            {/* Content on left */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
              <CardContent isDark={false} />
            </div>
            {/* Image on right */}
            <div className="md:w-2/5 h-64 md:h-auto relative overflow-hidden">
              <img
                src={heroImage}
                alt={cluster.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={handleImageError}
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/10" />
            </div>
          </div>
        )}

        {/* Case 3: No image available - clean text card */}
        {noImagesAvailable && (
          <div className="rounded-xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 p-6 md:p-8">
            <CardContent isDark />
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
              onFollowJournalist={onFollowJournalist}
              onUnfollowJournalist={onUnfollowJournalist}
              isLiked={likedArticleUris.has(article.uri)}
              isSaved={savedArticleUris.has(article.uri)}
              isRead={readArticleUris.has(article.uri)}
              followedJournalists={followedJournalists}
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

// Extract reporter names from byline
function extractReporters(byline: string): string[] {
  // Remove "By " prefix
  let cleaned = byline.replace(/^By\s+/i, "");
  // Split on common delimiters
  const names = cleaned.split(/,\s*|\s+and\s+/i);
  return names.map((n) => n.trim()).filter((n) => n.length > 0 && !n.includes("@"));
}

// Timeline article item
function TimelineArticle({
  article,
  isLatest,
  onLike,
  onSave,
  onRead,
  onFollowJournalist,
  onUnfollowJournalist,
  isLiked,
  isSaved,
  isRead,
  followedJournalists = new Set(),
}: {
  article: Article;
  isLatest: boolean;
  onLike?: (uri: string) => void;
  onSave?: (uri: string) => void;
  onRead?: (uri: string) => void;
  onFollowJournalist?: (name: string) => void;
  onUnfollowJournalist?: (name: string) => void;
  isLiked: boolean;
  isSaved: boolean;
  isRead: boolean;
  followedJournalists?: Set<string>;
}) {
  const reporters = extractReporters(article.byline);
  return (
    <div className="relative pl-6">
      {/* Timeline dot */}
      <div
        className={cn(
          "absolute left-0 top-2 w-3 h-3 rounded-full -translate-x-[7px] border-2",
          isRead
            ? "bg-green-500 border-green-500"
            : isLatest
            ? "bg-blue-500 border-blue-500"
            : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
        )}
      />

      <div
        className={cn(
          "p-4 rounded-lg transition-colors",
          "hover:bg-gray-50 dark:hover:bg-gray-800/50",
          isLatest && !isRead && "bg-blue-50/50 dark:bg-blue-900/10",
          isRead && "opacity-70"
        )}
      >
        {/* Date and badges */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {format(new Date(article.publishedDate), "MMM d, h:mm a")}
          </span>
          {article.isLiveBlog && (
            <Badge variant="secondary" className="text-[10px] py-0 h-5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
              </span>
              LIVE
            </Badge>
          )}
          {isLatest && !article.isLiveBlog && (
            <Badge variant="secondary" className="text-[10px] py-0 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              Latest
            </Badge>
          )}
          {isRead && (
            <Badge variant="secondary" className="text-[10px] py-0 h-5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
              <Check className="w-3 h-3 mr-0.5" />
              Read
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3
          className={cn(
            "font-medium text-sm md:text-base leading-snug mb-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors",
            isRead && "text-gray-500 dark:text-gray-400"
          )}
          onClick={() => openArticleLink(article.url)}
        >
          {article.title}
        </h3>

        {/* Byline with follow buttons */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3">
          {reporters.length > 0 ? (
            reporters.map((reporter) => {
              const isFollowing = followedJournalists.has(reporter);
              return (
                <button
                  key={reporter}
                  onClick={() => {
                    if (isFollowing) {
                      onUnfollowJournalist?.(reporter);
                    } else {
                      onFollowJournalist?.(reporter);
                    }
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors",
                    isFollowing
                      ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                  title={isFollowing ? `Unfollow ${reporter}` : `Follow ${reporter}`}
                >
                  {isFollowing ? (
                    <UserCheck className="w-3 h-3" />
                  ) : (
                    <UserPlus className="w-3 h-3" />
                  )}
                  {reporter}
                </button>
              );
            })
          ) : (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {article.byline}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onLike?.(article.uri)}
            className={cn(
              "p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
              isLiked && "text-red-500"
            )}
            title="Like"
          >
            <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
          </button>
          <button
            onClick={() => onSave?.(article.uri)}
            className={cn(
              "p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
              isSaved && "text-blue-500"
            )}
            title="Save"
          >
            <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
          </button>
          <button
            onClick={() => onRead?.(article.uri)}
            className={cn(
              "p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
              isRead ? "text-green-500" : "text-gray-500"
            )}
            title={isRead ? "Marked as read" : "Mark as read"}
          >
            <Check className={cn("w-4 h-4", isRead && "stroke-[3px]")} />
          </button>
          <button
            onClick={() => openArticleLink(article.url)}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 ml-auto"
            title="Open article"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
