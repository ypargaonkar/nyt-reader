"use client";

import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  ChevronRight,
  Clock,
  ExternalLink,
  Newspaper,
  Heart,
  Bookmark,
  Check,
  Copy,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StoryCluster } from "@/lib/types";
import { cn, openArticleLink } from "@/lib/utils";

interface StoryClusterProps {
  cluster: StoryCluster;
  onLike?: (uri: string) => void;
  onSave?: (uri: string) => void;
  onRead?: (uri: string) => void;
  likedArticleUris?: Set<string>;
  savedArticleUris?: Set<string>;
}

export function StoryClusterCard({
  cluster,
  onLike,
  onSave,
  onRead,
  likedArticleUris = new Set(),
  savedArticleUris = new Set(),
}: StoryClusterProps) {
  const [expanded, setExpanded] = useState(false);
  const [copiedUri, setCopiedUri] = useState<string | null>(null);

  const handleCopyLink = async (e: React.MouseEvent, url: string, uri: string) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(url);
    setCopiedUri(uri);
    setTimeout(() => setCopiedUri(null), 2000);
  };

  const timespanStart = new Date(cluster.timespan.start);
  const timespanEnd = new Date(cluster.timespan.end);
  const daysDiff = Math.ceil(
    (timespanEnd.getTime() - timespanStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Get the hero image from the first article with an image
  const heroImage = cluster.articles.find((a) => a.imageUrl)?.imageUrl;

  // Get the latest article for the main display
  const latestArticle = cluster.articles[cluster.articles.length - 1];

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Hero Section */}
      <div
        className="relative cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Hero Image */}
        {heroImage && (
          <div className="relative h-48 overflow-hidden">
            <img
              src={heroImage}
              alt={cluster.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

            {/* Badges on image */}
            <div className="absolute top-3 left-3 flex gap-2">
              <Badge className="bg-blue-600 hover:bg-blue-700">
                <Newspaper className="w-3 h-3 mr-1" />
                {cluster.articles.length} articles
              </Badge>
              {daysDiff > 1 && (
                <Badge variant="secondary" className="bg-white/90 text-gray-800">
                  {daysDiff} day story
                </Badge>
              )}
            </div>

            {/* Title on image */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h2 className="text-xl md:text-2xl font-serif font-bold text-white leading-tight">
                {cluster.title}
              </h2>
            </div>
          </div>
        )}

        {/* No image fallback */}
        {!heroImage && (
          <div className="p-4 pb-2">
            <div className="flex gap-2 mb-2">
              <Badge className="bg-blue-600 hover:bg-blue-700">
                <Newspaper className="w-3 h-3 mr-1" />
                {cluster.articles.length} articles
              </Badge>
              {daysDiff > 1 && (
                <Badge variant="outline">
                  {daysDiff} day story
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-serif font-bold leading-tight">
              {cluster.title}
            </h2>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 pt-3">
        {/* Summary */}
        {cluster.summary && (
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
            {cluster.summary}
          </p>
        )}

        {/* Timeline indicator */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {format(timespanStart, "MMM d")} – {format(timespanEnd, "MMM d, yyyy")}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Collapse" : "View timeline"}
            <ChevronRight className={cn(
              "w-3.5 h-3.5 transition-transform",
              expanded && "rotate-90"
            )} />
          </Button>
        </div>

        {/* Keywords */}
        {cluster.keywords.length > 0 && !expanded && (
          <div className="flex flex-wrap gap-1.5">
            {cluster.keywords.slice(0, 4).map((keyword) => (
              <span
                key={keyword}
                className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}

        {/* Collapsed Preview - Article Cards */}
        {!expanded && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
            {cluster.articles.slice(-3).reverse().map((article, idx) => (
              <div
                key={article.uri}
                className={cn(
                  "shrink-0 w-48 p-2.5 rounded-lg transition-all",
                  "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800",
                  idx === 0 && "ring-1 ring-blue-200 dark:ring-blue-800 bg-blue-50/50 dark:bg-blue-900/20"
                )}
              >
                <div
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    openArticleLink(article.url);
                  }}
                >
                  {idx === 0 && (
                    <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                      Latest
                    </span>
                  )}
                  <p className="text-xs font-medium line-clamp-2 leading-snug mt-0.5">
                    {article.title}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5">
                    {formatDistanceToNow(new Date(article.publishedDate), { addSuffix: true })}
                  </p>
                </div>
                {/* Action buttons */}
                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLike?.(article.uri);
                    }}
                    className={cn(
                      "p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors",
                      likedArticleUris.has(article.uri) && "text-red-500"
                    )}
                    title={likedArticleUris.has(article.uri) ? "Unlike" : "Like"}
                  >
                    <Heart className={cn("w-3.5 h-3.5", likedArticleUris.has(article.uri) && "fill-current")} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSave?.(article.uri);
                    }}
                    className={cn(
                      "p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors",
                      savedArticleUris.has(article.uri) && "text-blue-500"
                    )}
                    title={savedArticleUris.has(article.uri) ? "Unsave" : "Save"}
                  >
                    <Bookmark className={cn("w-3.5 h-3.5", savedArticleUris.has(article.uri) && "fill-current")} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRead?.(article.uri);
                    }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Mark as read"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleCopyLink(e, article.url, article.uri)}
                    className={cn(
                      "p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors",
                      copiedUri === article.uri && "text-green-500"
                    )}
                    title="Copy link"
                  >
                    {copiedUri === article.uri ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expanded Timeline View */}
        {expanded && (
          <div className="mt-4 border-t pt-4">
            <div className="space-y-0">
              {cluster.articles.slice().reverse().map((article, index) => (
                <div
                  key={article.uri}
                  className="flex gap-3 group"
                >
                  {/* Timeline */}
                  <div className="flex flex-col items-center w-6 shrink-0">
                    <div
                      className={cn(
                        "w-2.5 h-2.5 rounded-full border-2 mt-1.5 z-10",
                        index === 0
                          ? "bg-blue-500 border-blue-500"
                          : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                      )}
                    />
                    {index < cluster.articles.length - 1 && (
                      <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 -mt-0.5" />
                    )}
                  </div>

                  {/* Article Card */}
                  <div
                    className={cn(
                      "flex-1 flex flex-col p-3 -mt-1 mb-2 rounded-lg transition-all",
                      "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                      index === 0 && "bg-blue-50/50 dark:bg-blue-900/20"
                    )}
                  >
                    <div
                      className="flex gap-3 cursor-pointer"
                      onClick={() => window.open(article.url, "_blank")}
                    >
                      {/* Article Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                            {format(new Date(article.publishedDate), "MMM d, h:mm a")}
                          </span>
                          {index === 0 && (
                            <Badge variant="secondary" className="text-[10px] py-0 h-4">
                              Latest
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-medium text-sm leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {article.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                          {article.byline}
                        </p>
                      </div>

                      {/* Thumbnail */}
                      {article.imageUrl && (
                        <div className="w-20 h-14 rounded overflow-hidden shrink-0">
                          <img
                            src={article.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLike?.(article.uri);
                        }}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                          likedArticleUris.has(article.uri) && "text-red-500"
                        )}
                      >
                        <Heart className={cn("w-3.5 h-3.5", likedArticleUris.has(article.uri) && "fill-current")} />
                        <span>{likedArticleUris.has(article.uri) ? "Liked" : "Like"}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSave?.(article.uri);
                        }}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                          savedArticleUris.has(article.uri) && "text-blue-500"
                        )}
                      >
                        <Bookmark className={cn("w-3.5 h-3.5", savedArticleUris.has(article.uri) && "fill-current")} />
                        <span>{savedArticleUris.has(article.uri) ? "Saved" : "Save"}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRead?.(article.uri);
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Read</span>
                      </button>
                      <button
                        onClick={(e) => handleCopyLink(e, article.url, article.uri)}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-auto",
                          copiedUri === article.uri && "text-green-500"
                        )}
                      >
                        {copiedUri === article.uri ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUri === article.uri ? "Copied!" : "Share"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center mt-3 pt-3 border-t">
              <div className="flex flex-wrap gap-1.5">
                {cluster.keywords.slice(0, 3).map((keyword) => (
                  <span
                    key={keyword}
                    className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8"
                onClick={() => {
                  cluster.articles.forEach((article) => {
                    openArticleLink(article.url);
                  });
                }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open all
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
