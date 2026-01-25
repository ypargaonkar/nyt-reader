"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek, differenceInMinutes } from "date-fns";
import { Heart, Check, Clock, UserPlus, UserCheck, Bookmark, Copy, Square, CheckSquare, Calendar, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Article } from "@/lib/types";
import { cn, openArticleLink } from "@/lib/utils";

interface ArticleCardProps {
  article: Article;
  onRead: (uri: string) => void;
  onLike: (uri: string) => void;
  onSave?: (uri: string) => void;
  onOpen?: (uri: string) => void;
  onFollowJournalist?: (name: string) => void;
  onPreview?: (article: Article) => void;
  onSelect?: (uri: string) => void;
  isLiked?: boolean;
  isSaved?: boolean;
  isRead?: boolean;
  isSelected?: boolean;
  isSelectable?: boolean;
  isChecked?: boolean;
  showRelevanceScore?: boolean;
  followedJournalists?: Set<string>;
}

// Parse byline to extract individual journalist names
function parseByline(byline: string): string[] {
  if (!byline) return [];

  // Remove "By " prefix
  const cleaned = byline.replace(/^By\s+/i, "").trim();
  if (!cleaned) return [];

  // Split by " and " or ", " or "; "
  const names = cleaned.split(/\s+and\s+|,\s*(?=\S)|;\s*/i);

  return names
    .map((name) => name.trim())
    .filter((name) => name.length > 2 && !name.toLowerCase().includes("the new york times"));
}

export function ArticleCard({
  article,
  onRead,
  onLike,
  onSave,
  onOpen,
  onFollowJournalist,
  onPreview,
  onSelect,
  isLiked = false,
  isSaved = false,
  isRead = false,
  isSelected = false,
  isSelectable = false,
  isChecked = false,
  showRelevanceScore = false,
  followedJournalists = new Set(),
}: ArticleCardProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [liked, setLiked] = useState(isLiked);
  const [saved, setSaved] = useState(isSaved);
  const [copied, setCopied] = useState(false);
  const [localFollowed, setLocalFollowed] = useState<Set<string>>(new Set());

  // Sync local state when article changes
  useEffect(() => {
    setLiked(isLiked);
    setSaved(isSaved);
    setIsRemoving(false);
    setCopied(false);
  }, [article.uri, isLiked, isSaved]);

  const journalists = parseByline(article.byline);

  const isFollowing = (name: string) =>
    followedJournalists.has(name) || localFollowed.has(name);

  const handleFollowClick = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (onFollowJournalist) {
      onFollowJournalist(name);
      // Optimistically update local state
      setLocalFollowed((prev) => {
        const newSet = new Set(prev);
        if (followedJournalists.has(name) || prev.has(name)) {
          newSet.delete(name);
        } else {
          newSet.add(name);
        }
        return newSet;
      });
    }
  };

  // Just open the article without marking as read
  const handleOpen = () => {
    onOpen?.(article.uri);
    openArticleLink(article.url);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(!liked);
    onLike(article.uri);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaved(!saved);
    if (onSave) {
      onSave(article.uri);
    }
  };

  // Mark as read and remove from feed
  const handleMarkRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRemoving(true);
    setTimeout(() => {
      onRead(article.uri);
    }, 300);
  };

  // Estimate read time (200 words per minute)
  const readTime = article.wordCount
    ? Math.max(1, Math.ceil(article.wordCount / 200))
    : null;

  // Format dates
  const publishedDate = new Date(article.publishedDate);
  const updatedDate = article.updatedDate ? new Date(article.updatedDate) : null;

  const publishedAgo = formatDistanceToNow(publishedDate, { addSuffix: true });
  const wasUpdated = updatedDate && differenceInMinutes(updatedDate, publishedDate) > 5;
  const updatedAgo = wasUpdated ? formatDistanceToNow(updatedDate, { addSuffix: true }) : null;

  // Get recency styling
  const getRecencyStyle = () => {
    const minutesAgo = differenceInMinutes(new Date(), publishedDate);
    if (minutesAgo < 60) return "text-red-600 dark:text-red-400 font-semibold"; // < 1 hour - breaking
    if (isToday(publishedDate)) return "text-green-600 dark:text-green-400 font-medium"; // Today
    if (isYesterday(publishedDate)) return "text-blue-600 dark:text-blue-400"; // Yesterday
    if (isThisWeek(publishedDate)) return "text-gray-600 dark:text-gray-300"; // This week
    return "text-gray-500 dark:text-gray-400"; // Older
  };

  // Format the actual date
  const formattedDate = isToday(publishedDate)
    ? format(publishedDate, "'Today at' h:mm a")
    : isYesterday(publishedDate)
    ? format(publishedDate, "'Yesterday at' h:mm a")
    : format(publishedDate, "MMM d, yyyy 'at' h:mm a");

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-300 hover:shadow-lg overflow-hidden",
        isRemoving && "opacity-0 scale-95 -translate-x-4",
        isSelected && "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900"
      )}
      onClick={handleOpen}
    >
      <div className="flex flex-col md:flex-row">
        {/* Image */}
        {article.imageUrl && (
          <div className="md:w-72 md:min-w-72 h-48 md:h-auto relative overflow-hidden">
            <img
              src={article.imageUrl}
              alt={article.imageCaption || article.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {article.isInteractive && (
              <Badge className="absolute top-2 left-2 bg-blue-600">
                Interactive
              </Badge>
            )}
          </div>
        )}

        {/* Content */}
        <CardContent className="flex-1 p-5">
          <div className="flex flex-col h-full">
            {/* Section badge - simplified */}
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs font-medium uppercase">
                {article.section}
              </Badge>
              {showRelevanceScore && article.relevanceScore && article.relevanceScore >= 60 && (
                <span
                  className="ml-auto text-xs text-gray-500 dark:text-gray-400"
                  title={`${article.relevanceScore}% match based on your reading history`}
                >
                  For you
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-xl font-serif font-bold leading-tight mb-2 group-hover:text-blue-600 transition-colors">
              {article.title}
            </h2>

            {/* Abstract */}
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-3 line-clamp-2">
              {article.abstract}
            </p>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
              {journalists.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  {journalists.map((name, idx) => {
                    const following = isFollowing(name);
                    return (
                      <span key={name} className="inline-flex items-center">
                        {idx > 0 && <span className="mr-1">,</span>}
                        <button
                          onClick={(e) => handleFollowClick(e, name)}
                          className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full transition-colors",
                            following
                              ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                              : "hover:bg-gray-100 dark:hover:bg-gray-800"
                          )}
                          title={following ? `Unfollow ${name}` : `Follow ${name}`}
                        >
                          {following ? (
                            <UserCheck className="w-3 h-3" />
                          ) : (
                            <UserPlus className="w-3 h-3 opacity-60" />
                          )}
                          <span className={cn(following && "font-medium")}>
                            {name}
                          </span>
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              {/* Published/Updated time - more prominent */}
              <div className={cn("flex items-center gap-1.5", getRecencyStyle())} title={formattedDate}>
                <Calendar className="w-3.5 h-3.5" />
                <span>{publishedAgo}</span>
              </div>
              {wasUpdated && (
                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400" title={`Updated ${format(updatedDate!, "MMM d, yyyy 'at' h:mm a")}`}>
                  <RefreshCw className="w-3 h-3" />
                  <span className="text-xs">Updated {updatedAgo}</span>
                </div>
              )}
              {readTime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {readTime} min read
                </span>
              )}
            </div>

            {/* Primary keyword - simplified */}
            {article.keywords.length > 0 && (
              <div className="mb-3">
                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300">
                  {article.keywords[0]}
                </span>
              </div>
            )}

            {/* Actions - compact icons */}
            <div className="flex items-center gap-1 mt-auto pt-2 border-t">
              {/* Selection checkbox for bulk mode */}
              {isSelectable && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect?.(article.uri);
                  }}
                >
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-blue-500" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8",
                  liked && "text-red-500 hover:text-red-600"
                )}
                onClick={handleLike}
                title={liked ? "Unlike" : "Like"}
              >
                <Heart className={cn("w-4 h-4", liked && "fill-current")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8",
                  saved && "text-blue-500 hover:text-blue-600"
                )}
                onClick={handleSave}
                title={saved ? "Unsave" : "Save"}
              >
                <Bookmark className={cn("w-4 h-4", saved && "fill-current")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8",
                  isRead && "text-green-500 hover:text-green-600"
                )}
                onClick={handleMarkRead}
                title={isRead ? "Already read" : "Mark as read"}
              >
                <Check className={cn("w-4 h-4", isRead && "fill-current")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 ml-auto", copied && "text-green-500")}
                onClick={async (e) => {
                  e.stopPropagation();
                  await navigator.clipboard.writeText(article.url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                title={copied ? "Copied!" : "Copy link"}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
