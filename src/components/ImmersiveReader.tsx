"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import {
  X,
  ExternalLink,
  Heart,
  Bookmark,
  Check,
  Sun,
  Moon,
  Coffee,
  Smartphone,
  Type,
  Minus,
  Plus,
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Settings2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Article } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ImmersiveReaderProps {
  article: Article | null;
  open: boolean;
  onClose: () => void;
  onLike: (uri: string) => void;
  onSave: (uri: string) => void;
  onRead: (uri: string) => void;
  isLiked: boolean;
  isSaved: boolean;
  // Navigation
  articles?: Article[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
}

type ThemeMode = "light" | "dark" | "sepia" | "midnight";
type FontFamily = "serif" | "sans" | "mono";

const themeStyles: Record<ThemeMode, { bg: string; text: string; accent: string; muted: string }> = {
  light: {
    bg: "bg-white",
    text: "text-gray-900",
    accent: "text-blue-600",
    muted: "text-gray-500",
  },
  dark: {
    bg: "bg-gray-900",
    text: "text-gray-100",
    accent: "text-blue-400",
    muted: "text-gray-400",
  },
  sepia: {
    bg: "bg-amber-50",
    text: "text-amber-950",
    accent: "text-amber-700",
    muted: "text-amber-700/70",
  },
  midnight: {
    bg: "bg-black",
    text: "text-gray-200",
    accent: "text-blue-300",
    muted: "text-gray-500",
  },
};

const fontFamilies: Record<FontFamily, string> = {
  serif: "font-serif",
  sans: "font-sans",
  mono: "font-mono",
};

export function ImmersiveReader({
  article,
  open,
  onClose,
  onLike,
  onSave,
  onRead,
  isLiked,
  isSaved,
  articles = [],
  currentIndex = 0,
  onNavigate,
}: ImmersiveReaderProps) {
  // Reading preferences
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [fontFamily, setFontFamily] = useState<FontFamily>("serif");
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [showSettings, setShowSettings] = useState(false);

  // Text-to-speech
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [speechSupported, setSpeechSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check for speech synthesis support
  useEffect(() => {
    setSpeechSupported("speechSynthesis" in window);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (onNavigate && currentIndex > 0) {
            onNavigate(currentIndex - 1);
          }
          break;
        case "ArrowRight":
          if (onNavigate && currentIndex < articles.length - 1) {
            onNavigate(currentIndex + 1);
          }
          break;
        case " ":
          e.preventDefault();
          if (isSpeaking) {
            togglePause();
          } else {
            startSpeaking();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, onNavigate, currentIndex, articles.length, isSpeaking]);

  // Stop speaking when article changes or modal closes
  useEffect(() => {
    if (!open || !article) {
      stopSpeaking();
    }
  }, [open, article?.uri]);

  const startSpeaking = useCallback(() => {
    if (!article || !speechSupported) return;

    // Stop any current speech
    window.speechSynthesis.cancel();

    const text = `${article.title}. ${article.byline}. ${article.abstract}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
  }, [article, speechRate, speechSupported]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const togglePause = useCallback(() => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isPaused]);

  if (!open || !article) return null;

  const styles = themeStyles[theme];
  const canGoPrev = onNavigate && currentIndex > 0;
  const canGoNext = onNavigate && currentIndex < articles.length - 1;

  return (
    <div className={cn("fixed inset-0 z-50 overflow-hidden", styles.bg)}>
      {/* Top Bar */}
      <div className={cn(
        "absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3",
        "bg-gradient-to-b from-black/20 to-transparent",
        theme === "light" && "from-white/80",
        theme === "sepia" && "from-amber-50/80"
      )}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className={cn("rounded-full", styles.text)}
        >
          <X className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-2">
          {/* Navigation */}
          {articles.length > 1 && (
            <div className="flex items-center gap-1 mr-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigate?.(currentIndex - 1)}
                disabled={!canGoPrev}
                className={cn("rounded-full h-8 w-8", styles.text)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className={cn("text-xs", styles.muted)}>
                {currentIndex + 1} / {articles.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigate?.(currentIndex + 1)}
                disabled={!canGoNext}
                className={cn("rounded-full h-8 w-8", styles.text)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Theme Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className={cn("rounded-full", styles.text)}>
                {theme === "light" && <Sun className="w-5 h-5" />}
                {theme === "dark" && <Moon className="w-5 h-5" />}
                {theme === "sepia" && <Coffee className="w-5 h-5" />}
                {theme === "midnight" && <Smartphone className="w-5 h-5" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Reading Theme</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="w-4 h-4 mr-2" /> Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="w-4 h-4 mr-2" /> Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("sepia")}>
                <Coffee className="w-4 h-4 mr-2" /> Sepia
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("midnight")}>
                <Smartphone className="w-4 h-4 mr-2" /> Midnight
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings */}
          <DropdownMenu open={showSettings} onOpenChange={setShowSettings}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className={cn("rounded-full", styles.text)}>
                <Settings2 className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-4">
              <DropdownMenuLabel>Typography</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Font Family */}
              <div className="mb-4">
                <label className="text-xs text-gray-500 mb-2 block">Font</label>
                <div className="flex gap-1">
                  <Button
                    variant={fontFamily === "serif" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFontFamily("serif")}
                    className="flex-1 font-serif"
                  >
                    Serif
                  </Button>
                  <Button
                    variant={fontFamily === "sans" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFontFamily("sans")}
                    className="flex-1"
                  >
                    Sans
                  </Button>
                  <Button
                    variant={fontFamily === "mono" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFontFamily("mono")}
                    className="flex-1 font-mono"
                  >
                    Mono
                  </Button>
                </div>
              </div>

              {/* Font Size */}
              <div className="mb-4">
                <label className="text-xs text-gray-500 mb-2 block">
                  Font Size: {fontSize}px
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Slider
                    value={[fontSize]}
                    onValueChange={([v]) => setFontSize(v)}
                    min={14}
                    max={28}
                    step={1}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Line Height */}
              <div>
                <label className="text-xs text-gray-500 mb-2 block">
                  Line Spacing: {lineHeight.toFixed(1)}
                </label>
                <Slider
                  value={[lineHeight]}
                  onValueChange={([v]) => setLineHeight(v)}
                  min={1.4}
                  max={2.4}
                  step={0.1}
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="h-full overflow-y-auto pt-16 pb-24">
        <article className="max-w-2xl mx-auto px-6 py-8">
          {/* Section */}
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline" className={cn("uppercase text-xs", styles.muted)}>
              {article.section}
            </Badge>
            {article.subsection && (
              <Badge variant="secondary" className="text-xs">
                {article.subsection}
              </Badge>
            )}
          </div>

          {/* Title */}
          <h1
            className={cn("font-bold leading-tight mb-4", styles.text, fontFamilies[fontFamily])}
            style={{ fontSize: fontSize * 1.8, lineHeight: 1.2 }}
          >
            {article.title}
          </h1>

          {/* Byline & Date */}
          <div className={cn("mb-6", styles.muted)} style={{ fontSize: fontSize * 0.85 }}>
            {article.byline && <p className="mb-1">{article.byline}</p>}
            <p>{format(new Date(article.publishedDate), "MMMM d, yyyy 'at' h:mm a")}</p>
          </div>

          {/* Hero Image */}
          {article.imageUrl && (
            <figure className="mb-8 -mx-6 md:mx-0">
              <img
                src={article.imageUrl}
                alt={article.imageCaption || article.title}
                className="w-full rounded-lg"
              />
              {article.imageCaption && (
                <figcaption className={cn("text-sm mt-2 px-6 md:px-0", styles.muted)}>
                  {article.imageCaption}
                </figcaption>
              )}
            </figure>
          )}

          {/* Abstract */}
          <div
            className={cn("mb-8", styles.text, fontFamilies[fontFamily])}
            style={{ fontSize, lineHeight }}
          >
            <p className="first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:mt-1">
              {article.abstract}
            </p>
          </div>

          {/* Continue Reading CTA */}
          <div className={cn("border-t border-b py-6 my-8", theme === "midnight" ? "border-gray-800" : "border-gray-200")}>
            <p className={cn("text-center mb-4", styles.muted)} style={{ fontSize: fontSize * 0.9 }}>
              Continue reading the full article on The New York Times
            </p>
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={() => {
                  window.open(article.url, "_blank");
                  onRead(article.uri);
                }}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Read Full Article
              </Button>
            </div>
          </div>

          {/* Keywords */}
          {article.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {article.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className={cn(
                    "text-sm px-3 py-1 rounded-full",
                    theme === "midnight" ? "bg-gray-800" : "bg-gray-100 dark:bg-gray-800",
                    styles.muted
                  )}
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </article>
      </div>

      {/* Bottom Bar - Actions & Audio */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 z-10 px-4 py-3",
        "bg-gradient-to-t from-black/20 to-transparent",
        theme === "light" && "from-white/90",
        theme === "sepia" && "from-amber-50/90"
      )}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Article Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLike(article.uri)}
              className={cn("gap-1.5", isLiked && "text-red-500")}
            >
              <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
              {isLiked ? "Liked" : "Like"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSave(article.uri)}
              className={cn("gap-1.5", isSaved && "text-blue-500")}
            >
              <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
              {isSaved ? "Saved" : "Save"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onRead(article.uri);
                onClose();
              }}
              className="gap-1.5"
            >
              <Check className="w-4 h-4" />
              Done
            </Button>
          </div>

          {/* Audio Controls */}
          {speechSupported && (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className={cn("gap-1", styles.text)}>
                    <Volume2 className="w-4 h-4" />
                    {speechRate}x
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Speech Rate</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <DropdownMenuItem
                      key={rate}
                      onClick={() => setSpeechRate(rate)}
                      className={speechRate === rate ? "bg-accent" : ""}
                    >
                      {rate}x {rate === 1 && "(Normal)"}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {!isSpeaking ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startSpeaking}
                  className="gap-1.5"
                >
                  <Play className="w-4 h-4" />
                  Listen
                </Button>
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={togglePause}
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={stopSpeaking}
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
