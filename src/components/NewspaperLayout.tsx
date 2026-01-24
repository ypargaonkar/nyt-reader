"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow, format, isToday, isYesterday, differenceInMinutes } from "date-fns";
import {
  Heart,
  Bookmark,
  Check,
  Clock,
  UserPlus,
  UserCheck,
  Sparkles,
  TrendingUp,
  Zap,
  ExternalLink,
} from "lucide-react";
import { NYTLogo } from "@/components/NYTLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SwipeableCard } from "@/components/SwipeableCard";
import type { Article } from "@/lib/types";
import type { NewspaperLayout as LayoutType } from "@/lib/smart-ranker";
import { cn } from "@/lib/utils";

// Section color mapping for visual coding
const sectionColors: Record<string, { bg: string; text: string; accent: string }> = {
  "Politics": { bg: "from-red-500/20 to-red-600/10", text: "text-red-600 dark:text-red-400", accent: "bg-red-500" },
  "U.S.": { bg: "from-blue-500/20 to-blue-600/10", text: "text-blue-600 dark:text-blue-400", accent: "bg-blue-500" },
  "World": { bg: "from-emerald-500/20 to-emerald-600/10", text: "text-emerald-600 dark:text-emerald-400", accent: "bg-emerald-500" },
  "Business": { bg: "from-amber-500/20 to-amber-600/10", text: "text-amber-600 dark:text-amber-400", accent: "bg-amber-500" },
  "Technology": { bg: "from-violet-500/20 to-violet-600/10", text: "text-violet-600 dark:text-violet-400", accent: "bg-violet-500" },
  "Science": { bg: "from-cyan-500/20 to-cyan-600/10", text: "text-cyan-600 dark:text-cyan-400", accent: "bg-cyan-500" },
  "Health": { bg: "from-pink-500/20 to-pink-600/10", text: "text-pink-600 dark:text-pink-400", accent: "bg-pink-500" },
  "Sports": { bg: "from-orange-500/20 to-orange-600/10", text: "text-orange-600 dark:text-orange-400", accent: "bg-orange-500" },
  "Arts": { bg: "from-fuchsia-500/20 to-fuchsia-600/10", text: "text-fuchsia-600 dark:text-fuchsia-400", accent: "bg-fuchsia-500" },
  "Opinion": { bg: "from-slate-500/20 to-slate-600/10", text: "text-slate-600 dark:text-slate-400", accent: "bg-slate-500" },
  "default": { bg: "from-gray-500/20 to-gray-600/10", text: "text-gray-600 dark:text-gray-400", accent: "bg-gray-500" },
};

const getSectionColor = (section: string) => {
  return sectionColors[section] || sectionColors["default"];
};

// NYT image size suffixes from largest to smallest for fallback cascade
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
function getImageUrlWithSize(url: string, targetSize: string): string {
  for (const suffix of KNOWN_SUFFIXES) {
    if (url.includes(`-${suffix}.`) || url.includes(`-${suffix}-`)) {
      return url.replace(`-${suffix}`, `-${targetSize}`);
    }
  }
  return url;
}

// Image with fallback placeholder and size cascade
function ArticleImage({
  src,
  alt,
  section,
  className,
  containerClassName,
  showOverlay = false,
  overlayClassName,
  children,
}: {
  src: string | null | undefined;
  alt: string;
  section: string;
  className?: string;
  containerClassName?: string;
  showOverlay?: boolean;
  overlayClassName?: string;
  children?: React.ReactNode;
}) {
  const [sizeIndex, setSizeIndex] = useState(0);
  const [allFailed, setAllFailed] = useState(false);
  const sectionColor = getSectionColor(section);

  // Reset state when src changes (new article)
  useEffect(() => {
    setSizeIndex(0);
    setAllFailed(false);
  }, [src]);

  // Get current image URL with cascaded size
  const currentSize = IMAGE_SIZES[sizeIndex];
  const imageUrl = src ? getImageUrlWithSize(src, currentSize) : null;

  // Handle image error - try next size
  const handleError = () => {
    if (sizeIndex < IMAGE_SIZES.length - 1) {
      setSizeIndex((prev) => prev + 1);
    } else {
      setAllFailed(true);
    }
  };

  // Show fallback if no src or all sizes failed
  if (!src || allFailed) {
    return (
      <div className={cn("relative overflow-hidden", containerClassName)}>
        <div
          className={cn(
            "w-full h-full flex flex-col items-center justify-center",
            "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900",
            className
          )}
        >
          <NYTLogo size="lg" className="mb-2 opacity-50" />
          <span className={cn("text-xs font-semibold uppercase tracking-wider", sectionColor.text)}>
            {section}
          </span>
        </div>
        {showOverlay && <div className={overlayClassName} />}
        {children}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      <img
        src={imageUrl!}
        alt={alt}
        className={className}
        onError={handleError}
      />
      {showOverlay && <div className={overlayClassName} />}
      {children}
    </div>
  );
}

// Hero image with fallback for the main hero article and size cascade
function HeroImage({
  src,
  alt,
  section,
  sectionColor,
}: {
  src: string | null | undefined;
  alt: string;
  section: string;
  sectionColor: { bg: string; text: string; accent: string };
}) {
  const [sizeIndex, setSizeIndex] = useState(0);
  const [allFailed, setAllFailed] = useState(false);

  // Reset state when src changes (new article)
  useEffect(() => {
    setSizeIndex(0);
    setAllFailed(false);
  }, [src]);

  // Get current image URL with cascaded size
  const currentSize = IMAGE_SIZES[sizeIndex];
  const imageUrl = src ? getImageUrlWithSize(src, currentSize) : null;

  // Handle image error - try next size
  const handleError = () => {
    if (sizeIndex < IMAGE_SIZES.length - 1) {
      setSizeIndex((prev) => prev + 1);
    } else {
      setAllFailed(true);
    }
  };

  if (!src || allFailed) {
    return (
      <div className="absolute inset-0">
        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <NYTLogo size="xl" className="opacity-30" variant="light" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-30", sectionColor.bg)} />
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <img
        src={imageUrl!}
        alt={alt}
        loading="eager"
        decoding="async"
        className="w-full h-full object-cover transition-transform duration-[10s] ease-out group-hover:scale-105"
        style={{
          objectPosition: "center 25%",
        }}
        onError={handleError}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-20", sectionColor.bg)} />
    </div>
  );
}

// Parse byline to extract journalist names
function parseByline(byline: string): string[] {
  if (!byline) return [];
  const cleaned = byline.replace(/^By\s+/i, "").trim();
  if (!cleaned) return [];
  const names = cleaned.split(/\s+and\s+|,\s*(?=\S)|;\s*/i);
  return names
    .map((name) => name.trim())
    .filter((name) => name.length > 2 && !name.toLowerCase().includes("the new york times"));
}

interface NewspaperLayoutProps {
  layout: LayoutType;
  onRead: (uri: string) => void;
  onLike: (uri: string) => void;
  onSave: (uri: string) => void;
  onOpen: (uri: string) => void;
  onFollowJournalist?: (name: string) => void;
  likedArticleUris: Set<string>;
  savedArticleUris: Set<string>;
  followedJournalists?: Set<string>;
  showRelevanceScore?: boolean;
}

// Reusable date badge component with animation
function DateBadge({ publishedDate }: { publishedDate: string }) {
  const date = new Date(publishedDate);
  const minutesAgo = differenceInMinutes(new Date(), date);

  if (minutesAgo < 60) {
    return (
      <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold animate-pulse shadow-lg shadow-red-500/25">
        <Zap className="w-3 h-3 mr-1" />
        BREAKING
      </Badge>
    );
  }
  if (isToday(date)) {
    return (
      <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-semibold shadow-lg shadow-green-500/25">
        <TrendingUp className="w-3 h-3 mr-1" />
        TODAY
      </Badge>
    );
  }
  return null;
}

// Time display with smart formatting
function TimeDisplay({ publishedDate, className }: { publishedDate: string; className?: string }) {
  const date = new Date(publishedDate);
  const minutesAgo = differenceInMinutes(new Date(), date);
  const hoursAgo = Math.floor(minutesAgo / 60);
  const daysAgo = Math.floor(hoursAgo / 24);

  const getTimeStyle = () => {
    if (minutesAgo < 60) return "text-red-500 font-semibold";
    if (isToday(date)) return "text-green-600 dark:text-green-400";
    if (isYesterday(date)) return "text-blue-500";
    return "text-gray-400";
  };

  // Shorter time format
  const getShortTime = () => {
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    if (hoursAgo < 24) return `${hoursAgo}h ago`;
    if (daysAgo === 1) return "Yesterday";
    if (daysAgo < 7) return `${daysAgo}d ago`;
    return format(date, "MMM d");
  };

  return (
    <span className={cn("flex items-center gap-1 text-xs whitespace-nowrap", getTimeStyle(), className)}>
      <Clock className="w-3 h-3 flex-shrink-0" />
      {getShortTime()}
    </span>
  );
}

// Journalist chip with follow functionality
function JournalistChip({
  name,
  isFollowing,
  onFollow,
  size = "sm",
}: {
  name: string;
  isFollowing: boolean;
  onFollow: () => void;
  size?: "sm" | "md";
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onFollow();
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full transition-all duration-200",
        "hover:scale-105 active:scale-95",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
        isFollowing
          ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25"
          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      )}
    >
      {isFollowing ? (
        <UserCheck className={cn("transition-transform", size === "sm" ? "w-3 h-3" : "w-4 h-4")} />
      ) : (
        <UserPlus className={cn("transition-transform", size === "sm" ? "w-3 h-3" : "w-4 h-4")} />
      )}
      <span className={cn(isFollowing && "font-medium")}>{name}</span>
    </button>
  );
}

// Action buttons with beautiful hover states
function ActionButtons({
  article,
  isLiked,
  isSaved,
  onLike,
  onSave,
  onRead,
  size = "md",
}: {
  article: Article;
  isLiked: boolean;
  isSaved: boolean;
  onLike: () => void;
  onSave: () => void;
  onRead: () => void;
  size?: "sm" | "md" | "lg";
}) {
  const [liked, setLiked] = useState(isLiked);
  const [saved, setSaved] = useState(isSaved);

  // Mobile-friendly touch targets (min 44px)
  const buttonSize = {
    sm: "p-2 md:p-1.5 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0",
    md: "p-2.5 md:p-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0",
    lg: "p-3 md:p-2.5 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0",
  }[size];

  const iconSize = {
    sm: "w-4 h-4 md:w-3.5 md:h-3.5",
    md: "w-5 h-5 md:w-4 md:h-4",
    lg: "w-6 h-6 md:w-5 md:h-5",
  }[size];

  return (
    <div className="flex items-center gap-1 md:gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => {
          setLiked(!liked);
          onLike();
        }}
        className={cn(
          buttonSize,
          "rounded-full transition-all duration-200 hover:scale-110 active:scale-95 touch-manipulation flex items-center justify-center",
          liked
            ? "bg-red-100 dark:bg-red-900/50 text-red-500"
            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-red-500"
        )}
      >
        <Heart className={cn(iconSize, liked && "fill-current")} />
      </button>
      <button
        onClick={() => {
          setSaved(!saved);
          onSave();
        }}
        className={cn(
          buttonSize,
          "rounded-full transition-all duration-200 hover:scale-110 active:scale-95 touch-manipulation flex items-center justify-center",
          saved
            ? "bg-blue-100 dark:bg-blue-900/50 text-blue-500"
            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-blue-500"
        )}
      >
        <Bookmark className={cn(iconSize, saved && "fill-current")} />
      </button>
      <button
        onClick={onRead}
        className={cn(
          buttonSize,
          "rounded-full transition-all duration-200 hover:scale-110 active:scale-95 touch-manipulation flex items-center justify-center",
          "hover:bg-green-100 dark:hover:bg-green-900/50 text-gray-500 hover:text-green-500"
        )}
      >
        <Check className={iconSize} />
      </button>
    </div>
  );
}

// Hero Article - Immersive full-width card
function HeroArticle({
  article,
  onRead,
  onLike,
  onSave,
  onOpen,
  onFollowJournalist,
  isLiked,
  isSaved,
  followedJournalists,
  showRelevanceScore,
}: {
  article: Article & { relevanceScore?: number };
  onRead: (uri: string) => void;
  onLike: (uri: string) => void;
  onSave: (uri: string) => void;
  onOpen: (uri: string) => void;
  onFollowJournalist?: (name: string) => void;
  isLiked: boolean;
  isSaved: boolean;
  followedJournalists: Set<string>;
  showRelevanceScore: boolean;
}) {
  const journalists = parseByline(article.byline);
  const sectionColor = getSectionColor(article.section);

  return (
    <article
      className="relative group cursor-pointer overflow-hidden rounded-2xl bg-gray-900 text-white shadow-2xl"
      onClick={() => {
        onOpen(article.uri);
        window.open(article.url, "_blank");
      }}
    >
      {/* Background Image with Ken Burns effect - focused on upper area for faces */}
      <HeroImage
        src={article.imageUrl}
        alt={article.title}
        section={article.section}
        sectionColor={sectionColor}
      />

      {/* Content */}
      <div className="relative z-10 p-8 md:p-12 min-h-[450px] md:min-h-[550px] flex flex-col justify-end">
        {/* Top badges */}
        <div className="absolute top-6 left-6 right-6 flex items-start justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <DateBadge publishedDate={article.publishedDate} />
            <Badge className={cn("uppercase text-xs font-bold backdrop-blur-sm", sectionColor.accent, "text-white")}>
              {article.section}
            </Badge>
          </div>
          {showRelevanceScore && article.relevanceScore && (
            <Badge className="bg-white/10 backdrop-blur-md text-white border border-white/20 text-xs gap-1.5">
              <Sparkles className="w-3 h-3 text-yellow-400" />
              {article.relevanceScore}% match
            </Badge>
          )}
        </div>

        {/* Title & Abstract */}
        <div className="max-w-4xl">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold leading-[1.1] mb-4 group-hover:text-blue-300 transition-colors duration-300">
            {article.title}
          </h1>
          <p className="text-lg md:text-xl text-gray-200/90 leading-relaxed mb-6 line-clamp-3 max-w-3xl">
            {article.abstract}
          </p>

          {/* Journalists */}
          {journalists.length > 0 && onFollowJournalist && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-gray-400 text-sm">By</span>
              {journalists.map((name) => (
                <JournalistChip
                  key={name}
                  name={name}
                  isFollowing={followedJournalists.has(name)}
                  onFollow={() => onFollowJournalist(name)}
                  size="md"
                />
              ))}
            </div>
          )}

          {/* Bottom row */}
          <div className="flex items-center justify-between">
            <TimeDisplay publishedDate={article.publishedDate} className="text-gray-300 text-sm" />

            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <ActionButtons
                article={article}
                isLiked={isLiked}
                isSaved={isSaved}
                onLike={() => onLike(article.uri)}
                onSave={() => onSave(article.uri)}
                onRead={() => onRead(article.uri)}
                size="lg"
              />
              <Button
                variant="secondary"
                size="sm"
                className="gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
              >
                <ExternalLink className="w-4 h-4" />
                Read
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

// Featured Card - Visual card with image
function FeaturedCard({
  article,
  onRead,
  onLike,
  onSave,
  onOpen,
  onFollowJournalist,
  isLiked,
  isSaved,
  followedJournalists,
  showRelevanceScore,
}: {
  article: Article & { relevanceScore?: number };
  onRead: (uri: string) => void;
  onLike: (uri: string) => void;
  onSave: (uri: string) => void;
  onOpen: (uri: string) => void;
  onFollowJournalist?: (name: string) => void;
  isLiked: boolean;
  isSaved: boolean;
  followedJournalists: Set<string>;
  showRelevanceScore: boolean;
}) {
  const journalists = parseByline(article.byline);
  const sectionColor = getSectionColor(article.section);

  return (
    <article
      className={cn(
        "group cursor-pointer rounded-2xl overflow-hidden",
        "bg-white dark:bg-gray-900",
        "border border-gray-100 dark:border-gray-800",
        "shadow-sm hover:shadow-xl dark:shadow-none",
        "transition-all duration-300 hover:-translate-y-1"
      )}
      onClick={() => {
        onOpen(article.uri);
        window.open(article.url, "_blank");
      }}
    >
      {/* Image with overlay - only render if there's an image */}
      {article.imageUrl && (
        <ArticleImage
          src={article.imageUrl}
          alt={article.title}
          section={article.section}
          containerClassName="h-52"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          showOverlay
          overlayClassName="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          {/* Floating badges */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <DateBadge publishedDate={article.publishedDate} />
            </div>
            {showRelevanceScore && article.relevanceScore && (
              <Badge className="bg-black/50 backdrop-blur-sm text-white text-xs border-0">
                {article.relevanceScore}% match
              </Badge>
            )}
          </div>

          {/* Section indicator bar */}
          <div className={cn("absolute bottom-0 left-0 right-0 h-1", sectionColor.accent)} />
        </ArticleImage>
      )}

      {/* Content */}
      <div className="p-5">
        <Badge variant="outline" className={cn("text-xs uppercase mb-3 font-semibold", sectionColor.text)}>
          {article.section}
        </Badge>

        <h2 className="text-lg font-serif font-bold leading-tight mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
          {article.title}
        </h2>

        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4 line-clamp-2">
          {article.abstract}
        </p>

        {/* Journalists */}
        {journalists.length > 0 && onFollowJournalist && (
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            {journalists.slice(0, 2).map((name) => (
              <JournalistChip
                key={name}
                name={name}
                isFollowing={followedJournalists.has(name)}
                onFollow={() => onFollowJournalist(name)}
                size="sm"
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
          <TimeDisplay publishedDate={article.publishedDate} />
          <ActionButtons
            article={article}
            isLiked={isLiked}
            isSaved={isSaved}
            onLike={() => onLike(article.uri)}
            onSave={() => onSave(article.uri)}
            onRead={() => onRead(article.uri)}
            size="sm"
          />
        </div>
      </div>
    </article>
  );
}

// Mini Card - Clean vertical card
function MiniCard({
  article,
  onRead,
  onLike,
  onSave,
  onOpen,
  onFollowJournalist,
  isLiked,
  isSaved,
  followedJournalists,
  showRelevanceScore,
}: {
  article: Article & { relevanceScore?: number };
  onRead: (uri: string) => void;
  onLike: (uri: string) => void;
  onSave: (uri: string) => void;
  onOpen: (uri: string) => void;
  onFollowJournalist?: (name: string) => void;
  isLiked: boolean;
  isSaved: boolean;
  followedJournalists: Set<string>;
  showRelevanceScore: boolean;
}) {
  const journalists = parseByline(article.byline);
  const sectionColor = getSectionColor(article.section);

  return (
    <article
      className={cn(
        "group cursor-pointer rounded-xl overflow-hidden",
        "bg-white dark:bg-gray-900",
        "border border-gray-100 dark:border-gray-800",
        "shadow-sm hover:shadow-xl dark:shadow-none",
        "transition-all duration-300 hover:-translate-y-1"
      )}
      onClick={() => {
        onOpen(article.uri);
        window.open(article.url, "_blank");
      }}
    >
      {/* Image - only render if there's an image */}
      {article.imageUrl && (
        <ArticleImage
          src={article.imageUrl}
          alt={article.title}
          section={article.section}
          containerClassName="h-40"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        >
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <DateBadge publishedDate={article.publishedDate} />
            {showRelevanceScore && article.relevanceScore && (
              <Badge className="bg-black/50 backdrop-blur-sm text-white text-xs border-0">
                {article.relevanceScore}%
              </Badge>
          )}
        </div>
          <div className={cn("absolute bottom-0 left-0 right-0 h-1", sectionColor.accent)} />
        </ArticleImage>
      )}

      {/* Content */}
      <div className="p-4">
        <div className={cn("text-xs font-semibold uppercase mb-2", sectionColor.text)}>
          {article.section}
        </div>

        <h3 className="font-serif font-bold text-base leading-snug mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
          {article.title}
        </h3>

        {/* Byline with follow functionality */}
        {journalists.length > 0 && onFollowJournalist && (
          <div className="flex flex-wrap items-center gap-1 mb-3">
            {journalists.slice(0, 2).map((name) => (
              <JournalistChip
                key={name}
                name={name}
                isFollowing={followedJournalists.has(name)}
                onFollow={() => onFollowJournalist(name)}
                size="sm"
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <TimeDisplay publishedDate={article.publishedDate} />
          <ActionButtons
            article={article}
            isLiked={isLiked}
            isSaved={isSaved}
            onLike={() => onLike(article.uri)}
            onSave={() => onSave(article.uri)}
            onRead={() => onRead(article.uri)}
            size="sm"
          />
        </div>
      </div>
    </article>
  );
}

// Horizontal scroll card for "More Stories"
function ScrollCard({
  article,
  onRead,
  onLike,
  onSave,
  onOpen,
  onFollowJournalist,
  isLiked,
  isSaved,
  followedJournalists,
  showRelevanceScore,
}: {
  article: Article & { relevanceScore?: number };
  onRead: (uri: string) => void;
  onLike: (uri: string) => void;
  onSave: (uri: string) => void;
  onOpen: (uri: string) => void;
  onFollowJournalist?: (name: string) => void;
  isLiked: boolean;
  isSaved: boolean;
  followedJournalists: Set<string>;
  showRelevanceScore: boolean;
}) {
  const sectionColor = getSectionColor(article.section);
  const journalists = parseByline(article.byline);

  return (
    <article
      className={cn(
        "group cursor-pointer flex-shrink-0 w-72 rounded-xl overflow-hidden",
        "bg-white dark:bg-gray-900",
        "border border-gray-100 dark:border-gray-800",
        "shadow-sm hover:shadow-lg dark:shadow-none",
        "transition-all duration-300 hover:-translate-y-1"
      )}
      onClick={() => {
        onOpen(article.uri);
        window.open(article.url, "_blank");
      }}
    >
      {article.imageUrl && (
        <ArticleImage
          src={article.imageUrl}
          alt={article.title}
          section={article.section}
          containerClassName="h-36"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        >
          <div className={cn("absolute bottom-0 left-0 right-0 h-1", sectionColor.accent)} />
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
            <DateBadge publishedDate={article.publishedDate} />
            {showRelevanceScore && article.relevanceScore && (
              <Badge className="bg-black/50 backdrop-blur-sm text-white text-xs border-0">
                {article.relevanceScore}%
              </Badge>
            )}
          </div>
        </ArticleImage>
      )}

      <div className="p-4">
        <span className={cn("text-xs font-semibold uppercase", sectionColor.text)}>
          {article.section}
        </span>
        <h4 className="font-serif font-bold text-sm leading-tight mt-1 mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {article.title}
        </h4>
        {/* Journalist follow */}
        {journalists.length > 0 && onFollowJournalist && (
          <div className="flex flex-wrap items-center gap-1 mb-2">
            {journalists.slice(0, 1).map((name) => (
              <JournalistChip
                key={name}
                name={name}
                isFollowing={followedJournalists.has(name)}
                onFollow={() => onFollowJournalist(name)}
                size="sm"
              />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <TimeDisplay publishedDate={article.publishedDate} />
          <ActionButtons
            article={article}
            isLiked={isLiked}
            isSaved={isSaved}
            onLike={() => onLike(article.uri)}
            onSave={() => onSave(article.uri)}
            onRead={() => onRead(article.uri)}
            size="sm"
          />
        </div>
      </div>
    </article>
  );
}

// Main Newspaper Layout Component
export function NewspaperLayout({
  layout,
  onRead,
  onLike,
  onSave,
  onOpen,
  onFollowJournalist,
  likedArticleUris,
  savedArticleUris,
  followedJournalists = new Set(),
  showRelevanceScore = false,
}: NewspaperLayoutProps) {
  const hasContent = layout.hero || layout.featured.length > 0 || layout.standard.length > 0;

  if (!hasContent) {
    return (
      <div className="text-center py-16 text-gray-500">
        No articles to display
      </div>
    );
  }

  // Combine standard and compact for better visual treatment
  const moreStories = [...layout.standard, ...layout.compact];
  const gridStories = moreStories.slice(0, 12);
  const scrollStories = moreStories.slice(12);

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      {layout.hero && (
        <section>
          <HeroArticle
            article={layout.hero}
            onRead={onRead}
            onLike={onLike}
            onSave={onSave}
            onOpen={onOpen}
            onFollowJournalist={onFollowJournalist}
            isLiked={likedArticleUris.has(layout.hero.uri)}
            isSaved={savedArticleUris.has(layout.hero.uri)}
            followedJournalists={followedJournalists}
            showRelevanceScore={showRelevanceScore}
          />
        </section>
      )}

      {/* Featured Section */}
      {layout.featured.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
            <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Featured Reports
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {layout.featured.map((article) => (
              <SwipeableCard
                key={article.uri}
                onSwipeRight={() => onLike(article.uri)}
                onSwipeLeft={() => onRead(article.uri)}
                rightLabel="Like"
                leftLabel="Dismiss"
              >
                <FeaturedCard
                  article={article}
                  onRead={onRead}
                  onLike={onLike}
                  onSave={onSave}
                  onOpen={onOpen}
                  onFollowJournalist={onFollowJournalist}
                  isLiked={likedArticleUris.has(article.uri)}
                  isSaved={savedArticleUris.has(article.uri)}
                  followedJournalists={followedJournalists}
                  showRelevanceScore={showRelevanceScore}
                />
              </SwipeableCard>
            ))}
          </div>
        </section>
      )}

      {/* More Stories Grid */}
      {gridStories.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
            <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              More Reports
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {gridStories.map((article) => (
              <SwipeableCard
                key={article.uri}
                onSwipeRight={() => onLike(article.uri)}
                onSwipeLeft={() => onRead(article.uri)}
                rightLabel="Like"
                leftLabel="Dismiss"
              >
                <MiniCard
                  article={article}
                  onRead={onRead}
                  onLike={onLike}
                  onSave={onSave}
                  onOpen={onOpen}
                  onFollowJournalist={onFollowJournalist}
                  isLiked={likedArticleUris.has(article.uri)}
                  isSaved={savedArticleUris.has(article.uri)}
                  followedJournalists={followedJournalists}
                  showRelevanceScore={showRelevanceScore}
                />
              </SwipeableCard>
            ))}
          </div>
        </section>
      )}

      {/* Horizontal Scroll Section for remaining stories */}
      {scrollStories.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
            <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Also in the News
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
          </div>
          <div className="relative -mx-4 px-4">
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
              {scrollStories.map((article) => (
                <div key={article.uri} className="snap-start">
                  <ScrollCard
                    article={article}
                    onRead={onRead}
                    onLike={onLike}
                    onSave={onSave}
                    onOpen={onOpen}
                    onFollowJournalist={onFollowJournalist}
                    isLiked={likedArticleUris.has(article.uri)}
                    isSaved={savedArticleUris.has(article.uri)}
                    followedJournalists={followedJournalists}
                    showRelevanceScore={showRelevanceScore}
                  />
                </div>
              ))}
            </div>
            {/* Fade edges */}
            <div className="absolute top-0 bottom-4 left-0 w-8 bg-gradient-to-r from-gray-50 dark:from-gray-950 to-transparent pointer-events-none" />
            <div className="absolute top-0 bottom-4 right-0 w-8 bg-gradient-to-l from-gray-50 dark:from-gray-950 to-transparent pointer-events-none" />
          </div>
        </section>
      )}
    </div>
  );
}
