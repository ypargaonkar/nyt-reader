"use client";

import { formatDistanceToNow, format } from "date-fns";
import {
  Heart,
  Bookmark,
  Check,
  ExternalLink,
  X,
  Clock,
  Share2,
  Copy,
  Mail,
  Link2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Article } from "@/lib/types";
import { cn, openArticleLink } from "@/lib/utils";
import { useState } from "react";

interface ArticlePreviewProps {
  article: Article | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRead: (uri: string) => void;
  onLike: (uri: string) => void;
  onSave: (uri: string) => void;
  isLiked: boolean;
  isSaved: boolean;
}

export function ArticlePreview({
  article,
  open,
  onOpenChange,
  onRead,
  onLike,
  onSave,
  isLiked,
  isSaved,
}: ArticlePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(isLiked);
  const [saved, setSaved] = useState(isSaved);

  if (!article) return null;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(article.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: "twitter" | "linkedin" | "email") => {
    const title = encodeURIComponent(article.title);
    const url = encodeURIComponent(article.url);

    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${title}&url=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      email: `mailto:?subject=${title}&body=Check out this article: ${url}`,
    };

    window.open(urls[platform], "_blank");
  };

  const handleLike = () => {
    setLiked(!liked);
    onLike(article.uri);
  };

  const handleSave = () => {
    setSaved(!saved);
    onSave(article.uri);
  };

  const handleMarkRead = () => {
    onRead(article.uri);
    onOpenChange(false);
  };

  const readTime = article.wordCount
    ? Math.max(1, Math.ceil(article.wordCount / 200))
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Hero Image */}
        {article.imageUrl && (
          <div className="relative h-56 overflow-hidden">
            <img
              src={article.imageUrl}
              alt={article.imageCaption || article.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-black/20 hover:bg-black/40 text-white"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="p-6">
          {/* Header without image */}
          {!article.imageUrl && (
            <DialogHeader className="mb-4">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => onOpenChange(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogHeader>
          )}

          {/* Section badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="outline" className="uppercase text-xs">
              {article.section}
            </Badge>
            {article.subsection && (
              <Badge variant="secondary" className="text-xs">
                {article.subsection}
              </Badge>
            )}
            {readTime && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {readTime} min read
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-serif font-bold leading-tight mb-3">
            {article.title}
          </h2>

          {/* Byline & Date */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-4">
            {article.byline && <span>{article.byline}</span>}
            <span>•</span>
            <span>{format(new Date(article.publishedDate), "MMMM d, yyyy")}</span>
            <span className="text-gray-400">
              ({formatDistanceToNow(new Date(article.publishedDate), { addSuffix: true })})
            </span>
          </div>

          {/* Abstract */}
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            {article.abstract}
          </p>

          {/* Keywords */}
          {article.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {article.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t">
            <Button
              variant="default"
              className="gap-2"
              onClick={() => openArticleLink(article.url)}
            >
              <ExternalLink className="w-4 h-4" />
              Read Full Article
            </Button>

            <Button
              variant="outline"
              size="icon"
              className={cn(liked && "text-red-500 border-red-200")}
              onClick={handleLike}
            >
              <Heart className={cn("w-4 h-4", liked && "fill-current")} />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className={cn(saved && "text-blue-500 border-blue-200")}
              onClick={handleSave}
            >
              <Bookmark className={cn("w-4 h-4", saved && "fill-current")} />
            </Button>

            <Button variant="outline" size="icon" onClick={handleMarkRead}>
              <Check className="w-4 h-4" />
            </Button>

            {/* Share dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Share2 className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Copy className="w-4 h-4 mr-2" />
                  {copied ? "Copied!" : "Copy link"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare("twitter")}>
                  <Link2 className="w-4 h-4 mr-2" />
                  Share on X (Twitter)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare("linkedin")}>
                  <Link2 className="w-4 h-4 mr-2" />
                  Share on LinkedIn
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare("email")}>
                  <Mail className="w-4 h-4 mr-2" />
                  Share via Email
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
