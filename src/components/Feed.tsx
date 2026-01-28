"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { AlertCircle, Newspaper, Settings, Bookmark, Layers, RefreshCw, CheckSquare, Square, Trash2, BookmarkPlus, Check, X, Search, LayoutGrid, List, History, Heart, BookOpen, Clock } from "lucide-react";
import { ArticleCard } from "./ArticleCard";
import { FeedSkeleton } from "./ArticleSkeleton";
import { MagazineStoryCard } from "./MagazineStoryCard";
import { ArticlePreview } from "./ArticlePreview";
import { NewspaperLayout } from "./NewspaperLayout";
import { DiscoverFeed } from "./DiscoverFeed";
// import { ImmersiveReader } from "./ImmersiveReader"; // Hidden until full article access
import { SearchFilter, applyFilters, type FilterOptions } from "./SearchFilter";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { rankArticles, rankForDiscovery, categorizeForNewspaper, type NewspaperLayout as LayoutType, type EngagementData } from "@/lib/smart-ranker";
import { filterArticlesBySection } from "@/lib/nyt-client";
import { useAutoScheduler } from "@/lib/useAutoScheduler";
import type { Article, FeedSection, StoryCluster } from "@/lib/types";
import { openArticleLink } from "@/lib/utils";

interface FeedProps {
  onOpenSettings: () => void;
}

export function Feed({ onOpenSettings }: FeedProps) {
  const {
    filteredArticles,
    masterCache,
    loading,
    error,
    currentSection,
    settings,
    profile,
    readArticleUris,
    likedArticleUris,
    savedArticleUris,
    followedJournalists,
    setMasterCache,
    setFilteredArticles,
    setLoading,
    setError,
    setLastRefresh,
    lastRefresh,
    setLastClusterRefresh,
    lastClusterRefresh,
    markAsRead,
    markAsLiked,
    saveArticle,
    unsaveArticle,
    dismissArticle,
    getMasterCache,
    isCacheValid,
    setFollowedJournalists,
    setSavedArticleUris,
    followJournalist,
    unfollowJournalist,
    globalFilters,
    setGlobalFilters,
    clearGlobalFilters,
  } = useAppStore();

  const [initialized, setInitialized] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [savedArticles, setSavedArticles] = useState<Article[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [storyClusters, setStoryClusters] = useState<StoryCluster[]>([]);
  const [clustersLoading, setClustersLoading] = useState(false);
  const [embeddingsStatus, setEmbeddingsStatus] = useState<{
    total: number;
    withEmbeddings: number;
  } | null>(null);
  const [engagementData, setEngagementData] = useState<EngagementData | null>(null);
  const articleRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Article Preview state
  const [previewArticle, setPreviewArticle] = useState<Article | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Local search state (search is per-tab, other filters are global)
  const [searchQuery, setSearchQuery] = useState("");

  // Combined filters object (global filters + local search)
  const filters: FilterOptions = {
    searchQuery,
    sections: globalFilters.sections,
    readingTime: globalFilters.readingTime,
    dateRange: globalFilters.dateRange,
    quickFilter: globalFilters.quickFilter,
  };

  // Handle filter changes - split between global and local
  const handleFiltersChange = (newFilters: FilterOptions) => {
    // Update local search
    setSearchQuery(newFilters.searchQuery);
    // Update global filters
    setGlobalFilters({
      sections: newFilters.sections,
      readingTime: newFilters.readingTime,
      dateRange: newFilters.dateRange,
      quickFilter: newFilters.quickFilter,
    });
  };

  // Bulk selection state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedUris, setSelectedUris] = useState<Set<string>>(new Set());

  // Layout mode state (card vs newspaper)
  const [viewMode, setViewMode] = useState<"card" | "newspaper">("newspaper");

  // History state
  const [historyTab, setHistoryTab] = useState<"liked" | "read">("liked");
  const [likedArticles, setLikedArticles] = useState<Article[]>([]);
  const [readArticles, setReadArticles] = useState<Article[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Get date string for grouping (YYYY-MM-DD)
  const getDateKey = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toISOString().split("T")[0];
  };

  // Section priority for sorting (lower = higher priority)
  const getSectionPriority = (sectionName: string): number => {
    const lowerSection = sectionName.toLowerCase();
    if (lowerSection === "politics" || lowerSection === "us politics") return 1;
    if (lowerSection === "u.s." || lowerSection === "us") return 2;
    if (lowerSection === "world") return 3;
    if (lowerSection === "business") return 4;
    if (lowerSection === "science") return 5;
    if (lowerSection === "technology" || lowerSection === "tech") return 6;
    if (lowerSection === "climate") return 7;
    if (lowerSection === "opinion") return 8;
    return 10; // Everything else
  };

  // Process and filter articles for current section (CLIENT-SIDE, no API call)
  const filterForSection = useCallback(
    (articles: Article[], section: FeedSection): Article[] => {
      // First filter by section
      let processed = filterArticlesBySection(articles, section);

      // Filter out read articles
      processed = processed.filter((a) => !readArticleUris.has(a.uri));

      // Use the smart ranking algorithm with engagement data
      const scored = rankArticles(
        processed,
        profile,
        followedJournalists,
        likedArticleUris,
        readArticleUris, // dismissedArticleUris - using read as a proxy
        engagementData, // Pass engagement patterns for boosting
      );

      return scored;
    },
    [profile, readArticleUris, followedJournalists, likedArticleUris, engagementData]
  );

  // Apply section filter to cached articles (no API call)
  const applySectionFilter = useCallback(() => {
    const cache = getMasterCache();
    if (cache) {
      const filtered = filterForSection(cache.articles, currentSection);
      setFilteredArticles(filtered);
      setFromCache(true);
    }
  }, [currentSection, filterForSection, getMasterCache, setFilteredArticles]);

  // Fetch articles from API (only when cache is invalid or force refresh)
  const fetchArticles = useCallback(
    async (forceRefresh: boolean = false) => {
      if (!settings.nytApiKey) {
        setError("Please add your NYT API key in settings to view articles.");
        return;
      }

      // If cache is valid and not forcing refresh, just filter locally
      if (!forceRefresh && isCacheValid()) {
        applySectionFilter();
        return;
      }

      setLoading(true);
      setError(null);
      setFromCache(false);

      try {
        const res = await fetch(
          `/api/articles?section=${currentSection}${forceRefresh ? "&refresh=true" : ""}`,
          {
            headers: {
              "x-nyt-api-key": settings.nytApiKey,
            },
          }
        );

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch articles");
        }

        const data = await res.json();

        // The API returns all articles, we store them as master cache
        // Note: API already filters by section, but we want ALL articles for local filtering
        // So we fetch with section=home to get everything, then filter locally

        // Actually, let's refetch with a special endpoint or just use what we get
        // For now, cache what we receive and filter
        setMasterCache(data.articles);
        setFromCache(data.fromCache || false);

        // Filter for current section
        const filtered = filterForSection(data.articles, currentSection);
        setFilteredArticles(filtered);

        // Calculate actual refresh time from cache age, or use now if fresh fetch
        if (data.fromCache && data.cacheAge) {
          const actualRefreshTime = new Date(Date.now() - data.cacheAge * 1000).toISOString();
          setLastRefresh(actualRefreshTime);
        } else {
          setLastRefresh(new Date().toISOString());
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch articles"
        );
      } finally {
        setLoading(false);
      }
    },
    [
      settings.nytApiKey,
      currentSection,
      filterForSection,
      setMasterCache,
      setFilteredArticles,
      setLoading,
      setError,
      setLastRefresh,
      isCacheValid,
      applySectionFilter,
    ]
  );

  // Fetch engagement data for ranking
  const fetchEngagementData = useCallback(async () => {
    try {
      const res = await fetch("/api/engagement");
      if (res.ok) {
        const data = await res.json();
        setEngagementData({
          likedKeywords: data.analysis?.likedKeywords || {},
          likedSections: data.analysis?.likedSections || {},
          likedReporters: data.analysis?.likedReporters || {},
          skippedKeywords: data.analysis?.skippedKeywords || {},
          skippedSections: data.analysis?.skippedSections || {},
          conversionRate: data.stats?.conversionRate || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch engagement data:", error);
    }
  }, []);

  // Initialize followed journalists and saved articles from server
  useEffect(() => {
    const initializeState = async () => {
      try {
        const [journalistsRes, savedRes] = await Promise.all([
          fetch("/api/journalists"),
          fetch("/api/saved"),
          fetchEngagementData(), // Fetch engagement data in parallel
        ]);

        if (journalistsRes.ok) {
          const data = await journalistsRes.json();
          setFollowedJournalists(new Set(data.journalists || []));
        }

        if (savedRes.ok) {
          const data = await savedRes.json();
          setSavedArticleUris(new Set(data.savedUris || []));
          setSavedArticles(data.articles || []);
        }
      } catch (error) {
        console.error("Failed to initialize state:", error);
      }
      setInitialized(true);
    };

    initializeState();
  }, [setFollowedJournalists, setSavedArticleUris, fetchEngagementData]);

  // Fetch story clusters
  const fetchClusters = useCallback(async () => {
    try {
      const res = await fetch("/api/clusters");
      if (res.ok) {
        const data = await res.json();
        setStoryClusters(data.clusters || []);

        // Get the most recent updatedAt from clusters to show when clustering was done
        if (data.clusters?.length > 0) {
          const mostRecentUpdate = data.clusters.reduce((latest: string | null, cluster: { updatedAt?: string }) => {
            if (!cluster.updatedAt) return latest;
            if (!latest) return cluster.updatedAt;
            return new Date(cluster.updatedAt) > new Date(latest) ? cluster.updatedAt : latest;
          }, null);

          if (mostRecentUpdate) {
            setLastClusterRefresh(mostRecentUpdate);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch clusters:", error);
    }
  }, [setLastClusterRefresh]);

  // Check embeddings status
  const checkEmbeddingsStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/embeddings");
      if (res.ok) {
        const data = await res.json();
        setEmbeddingsStatus({
          total: data.articlesCount,
          withEmbeddings: data.articlesWithEmbeddings,
        });
      }
    } catch (error) {
      console.error("Failed to check embeddings status:", error);
    }
  }, []);

  // Generate embeddings and rebuild clusters
  const generateClusters = useCallback(async () => {
    if (!settings.openaiApiKey) {
      alert("Please add your OpenAI API key in settings to use story clustering.");
      return;
    }

    setClustersLoading(true);

    try {
      // First generate embeddings for new articles
      await fetch("/api/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openaiApiKey: settings.openaiApiKey }),
      });

      // Then rebuild clusters
      const res = await fetch("/api/clusters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openaiApiKey: settings.openaiApiKey,
          generateSummaries: true,
        }),
      });

      if (res.ok) {
        // Set the cluster refresh time to NOW since we just rebuilt them
        setLastClusterRefresh(new Date().toISOString());
        await fetchClusters();
        await checkEmbeddingsStatus();
      }
    } catch (error) {
      console.error("Failed to generate clusters:", error);
    } finally {
      setClustersLoading(false);
    }
  }, [settings.openaiApiKey, fetchClusters, checkEmbeddingsStatus]);

  // Auto-scheduled task handlers (silent, no loading state for background tasks)
  const scheduledEmbeddings = useCallback(async () => {
    if (!settings.openaiApiKey) return;
    try {
      await fetch("/api/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openaiApiKey: settings.openaiApiKey }),
      });
    } catch (error) {
      console.error("[Scheduled] Failed to generate embeddings:", error);
    }
  }, [settings.openaiApiKey]);

  const scheduledStoryRebuild = useCallback(async () => {
    if (!settings.openaiApiKey) return;
    try {
      const res = await fetch("/api/clusters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openaiApiKey: settings.openaiApiKey,
          generateSummaries: true,
        }),
      });
      if (res.ok) {
        // Set the cluster refresh time to NOW since we just rebuilt them
        setLastClusterRefresh(new Date().toISOString());
        // Silently refresh clusters if on stories tab
        if (currentSection === "stories") {
          await fetchClusters();
        }
      }
    } catch (error) {
      console.error("[Scheduled] Failed to rebuild clusters:", error);
    }
  }, [settings.openaiApiKey, currentSection, fetchClusters, setLastClusterRefresh]);

  const scheduledProfileAnalysis = useCallback(async () => {
    if (!settings.openaiApiKey) return;
    try {
      await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openaiApiKey: settings.openaiApiKey }),
      });
      console.log("[Scheduled] Profile analysis complete");
    } catch (error) {
      console.error("[Scheduled] Failed to analyze profile:", error);
    }
  }, [settings.openaiApiKey]);

  // Initialize auto-scheduler
  useAutoScheduler({
    onEmbeddingsNeeded: scheduledEmbeddings,
    onStoryRebuildNeeded: scheduledStoryRebuild,
    onProfileAnalysisNeeded: scheduledProfileAnalysis,
  });

  // Clear search when switching tabs (search is local per tab)
  useEffect(() => {
    setSearchQuery("");
  }, [currentSection]);

  // Load clusters when switching to stories section
  useEffect(() => {
    if (currentSection === "stories" && initialized) {
      fetchClusters();
      checkEmbeddingsStatus();
    }
  }, [currentSection, initialized, fetchClusters, checkEmbeddingsStatus]);

  // Load history when switching to history section
  useEffect(() => {
    if (currentSection === "history" && initialized) {
      const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
          const [likedRes, readRes] = await Promise.all([
            fetch("/api/history?type=liked&limit=100"),
            fetch("/api/history?type=read&limit=100"),
          ]);

          if (likedRes.ok) {
            const data = await likedRes.json();
            setLikedArticles(data.articles || []);
          }
          if (readRes.ok) {
            const data = await readRes.json();
            setReadArticles(data.articles || []);
          }
        } catch (error) {
          console.error("Failed to fetch history:", error);
        } finally {
          setHistoryLoading(false);
        }
      };
      fetchHistory();
    }
  }, [currentSection, initialized]);

  // Fetch articles on initial load
  useEffect(() => {
    if (initialized && settings.nytApiKey) {
      fetchArticles(false);
    }
  }, [initialized, settings.nytApiKey]); // Only on init, not on section change

  // When section changes, filter locally (no API call)
  useEffect(() => {
    if (initialized && masterCache) {
      applySectionFilter();
    }
  }, [currentSection, initialized, masterCache, applySectionFilter]);

  // Handle marking as read (for articles user actually read)
  const handleRead = async (uri: string) => {
    markAsRead(uri);

    // Also remove from saved articles if it was saved
    if (savedArticleUris.has(uri)) {
      unsaveArticle(uri);
      setSavedArticles((prev) => prev.filter((a) => a.uri !== uri));
    }

    try {
      await fetch("/api/interact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleUri: uri, action: "read" }),
      });
    } catch (error) {
      console.error("Failed to record read:", error);
    }
  };

  // Handle dismiss (remove from feed forever, persisted so it never comes back)
  const handleDismiss = async (uri: string) => {
    dismissArticle(uri); // Removes from UI and persists to never show again

    try {
      await fetch("/api/interact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleUri: uri, action: "dismissed" }),
      });
    } catch (error) {
      console.error("Failed to record dismiss:", error);
    }
  };

  // Handle dismiss from saved section (also removes from saved)
  const handleDismissFromSaved = async (uri: string) => {
    // First unsave it
    unsaveArticle(uri);
    setSavedArticles((prev) => prev.filter((a) => a.uri !== uri));

    // Then dismiss it permanently
    dismissArticle(uri);

    try {
      // Record unsave
      await fetch("/api/interact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleUri: uri, action: "saved" }),
      });
      // Record dismiss
      await fetch("/api/interact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleUri: uri, action: "dismissed" }),
      });
    } catch (error) {
      console.error("Failed to record dismiss:", error);
    }
  };

  // Handle liking
  const handleLike = async (uri: string) => {
    const isCurrentlyLiked = likedArticleUris.has(uri);

    if (!isCurrentlyLiked) {
      markAsLiked(uri);

      try {
        const res = await fetch("/api/interact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleUri: uri, action: "liked" }),
        });

        const data = await res.json();

        // Refresh engagement data to improve ranking with new like
        fetchEngagementData();

        // Trigger AI analysis if we have enough new likes
        if (data.shouldTriggerAnalysis && settings.openaiApiKey) {
          fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ openaiApiKey: settings.openaiApiKey }),
          }).catch(console.error);
        }
      } catch (error) {
        console.error("Failed to record like:", error);
      }
    }
  };

  // Handle saving/unsaving articles
  const handleSave = async (uri: string) => {
    const isCurrentlySaved = savedArticleUris.has(uri);

    // Optimistically update UI
    if (isCurrentlySaved) {
      unsaveArticle(uri);
      setSavedArticles((prev) => prev.filter((a) => a.uri !== uri));
    } else {
      saveArticle(uri);
      // Find the article and add to saved articles
      const article = filteredArticles.find((a) => a.uri === uri) ||
        masterCache?.articles.find((a) => a.uri === uri);
      if (article) {
        setSavedArticles((prev) => [article, ...prev]);
      }
    }

    try {
      const res = await fetch("/api/interact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleUri: uri, action: "saved" }),
      });

      if (!res.ok) {
        // Revert on error
        if (isCurrentlySaved) {
          saveArticle(uri);
        } else {
          unsaveArticle(uri);
        }
      }
    } catch (error) {
      console.error("Failed to save article:", error);
      // Revert on error
      if (isCurrentlySaved) {
        saveArticle(uri);
      } else {
        unsaveArticle(uri);
      }
    }
  };

  // Handle opening article (track for engagement pattern)
  const handleOpen = async (uri: string) => {
    try {
      await fetch("/api/interact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleUri: uri, action: "opened" }),
      });
    } catch (error) {
      console.error("Failed to record open:", error);
    }
  };

  // Handle following/unfollowing journalist
  const handleFollowJournalist = async (name: string) => {
    const isCurrentlyFollowing = followedJournalists.has(name);

    // Optimistically update UI
    if (isCurrentlyFollowing) {
      unfollowJournalist(name);
    } else {
      followJournalist(name);
    }

    try {
      await fetch("/api/journalists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, action: "toggle" }),
      });
    } catch (error) {
      console.error("Failed to update journalist follow status:", error);
      // Revert on error
      if (isCurrentlyFollowing) {
        followJournalist(name);
      } else {
        unfollowJournalist(name);
      }
    }
  };

  // Handle article preview
  const handlePreview = (article: Article) => {
    setPreviewArticle(article);
    setPreviewOpen(true);
  };

  // Handle bulk selection toggle
  const handleSelectArticle = (uri: string) => {
    setSelectedUris((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(uri)) {
        newSet.delete(uri);
      } else {
        newSet.add(uri);
      }
      return newSet;
    });
  };

  // Bulk actions
  const handleBulkMarkRead = async () => {
    for (const uri of selectedUris) {
      await handleRead(uri);
    }
    setSelectedUris(new Set());
    setBulkMode(false);
  };

  const handleBulkSave = async () => {
    for (const uri of selectedUris) {
      if (!savedArticleUris.has(uri)) {
        await handleSave(uri);
      }
    }
    setSelectedUris(new Set());
    setBulkMode(false);
  };

  const handleSelectAll = () => {
    const allUris = new Set(displayedArticles.map((a) => a.uri));
    setSelectedUris(allUris);
  };

  const handleDeselectAll = () => {
    setSelectedUris(new Set());
  };

  // Get available sections for filter
  const availableSections = [...new Set(
    (currentSection === "saved" ? savedArticles : filteredArticles).map((a) => a.section)
  )].sort();

  // Get base articles list based on section
  const baseArticles = currentSection === "saved" ? savedArticles : filteredArticles;

  // Apply search/filter to articles
  const displayedArticles = applyFilters(baseArticles, filters);

  // Get current articles list (for keyboard nav compatibility)
  const currentArticles = displayedArticles;

  // Scroll selected article into view
  const scrollToArticle = useCallback((index: number) => {
    const element = articleRefs.current.get(index);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in an input or if a modal is open
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        document.querySelector('[role="dialog"]')
      ) {
        return;
      }

      const articlesCount = currentArticles.length;
      if (articlesCount === 0) return;

      switch (e.key.toLowerCase()) {
        case "j": // Move down
          e.preventDefault();
          setSelectedIndex((prev) => {
            const next = prev < articlesCount - 1 ? prev + 1 : prev;
            scrollToArticle(next);
            return next;
          });
          break;

        case "k": // Move up
          e.preventDefault();
          setSelectedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : 0;
            scrollToArticle(next);
            return next;
          });
          break;

        case "o": // Open article
        case "enter":
          if (selectedIndex >= 0 && selectedIndex < articlesCount) {
            e.preventDefault();
            const article = currentArticles[selectedIndex];
            openArticleLink(article.url);
          }
          break;

        case "l": // Like/unlike
          if (selectedIndex >= 0 && selectedIndex < articlesCount) {
            e.preventDefault();
            const article = currentArticles[selectedIndex];
            handleLike(article.uri);
          }
          break;

        case "s": // Save/unsave
          if (selectedIndex >= 0 && selectedIndex < articlesCount) {
            e.preventDefault();
            const article = currentArticles[selectedIndex];
            handleSave(article.uri);
          }
          break;

        case "m": // Mark as read
          if (selectedIndex >= 0 && selectedIndex < articlesCount) {
            e.preventDefault();
            const article = currentArticles[selectedIndex];
            handleRead(article.uri);
            // Move selection to next article or stay at end
            setSelectedIndex((prev) =>
              prev >= articlesCount - 1 ? Math.max(0, articlesCount - 2) : prev
            );
          }
          break;

        case "g": // Go to top
          e.preventDefault();
          setSelectedIndex(0);
          scrollToArticle(0);
          break;

        case "p": // Preview article
          if (selectedIndex >= 0 && selectedIndex < articlesCount) {
            e.preventDefault();
            const article = currentArticles[selectedIndex];
            handlePreview(article);
          }
          break;

        case "x": // Toggle selection in bulk mode
          if (bulkMode && selectedIndex >= 0 && selectedIndex < articlesCount) {
            e.preventDefault();
            const article = currentArticles[selectedIndex];
            handleSelectArticle(article.uri);
          }
          break;

        case "escape": // Clear selection or exit bulk mode
          e.preventDefault();
          if (bulkMode) {
            setBulkMode(false);
            setSelectedUris(new Set());
          } else {
            setSelectedIndex(-1);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentArticles, selectedIndex, scrollToArticle, handleLike, handleSave, handleRead, handlePreview, bulkMode, handleSelectArticle]);

  // Reset selection when section changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [currentSection]);

  // Show setup prompt if no API key
  if (!settings.nytApiKey) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <Settings className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Welcome to NYT <span className="text-amber-500">Reader</span></h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
          To get started, add your New York Times API key in settings. You can
          get a free key at developer.nytimes.com
        </p>
        <Button onClick={onOpenSettings}>Open Settings</Button>
      </div>
    );
  }

  // Show loading state
  if (loading && filteredArticles.length === 0) {
    return <FeedSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <AlertCircle className="h-16 w-16 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Unable to load articles</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
          {error}
        </p>
        <Button onClick={() => fetchArticles(true)}>Try Again</Button>
      </div>
    );
  }

  // Show empty state
  if (currentSection === "saved" && savedArticles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <Bookmark className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No saved articles</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Save articles to read later by clicking the bookmark icon on any article.
        </p>
      </div>
    );
  }

  // History section
  if (currentSection === "history") {
    const historyArticles = historyTab === "liked" ? likedArticles : readArticles;
    const filteredHistory = applyFilters(historyArticles, filters);
    const historySections = [...new Set(historyArticles.map((a) => a.section))].sort();
    const hasHistoryFilters = filters.searchQuery || filters.sections.length > 0 ||
      filters.readingTime !== "any" || filters.dateRange !== "any" || filters.quickFilter;

    if (historyLoading) {
      return <FeedSkeleton />;
    }

    return (
      <div className="space-y-4">
        {/* Tab selector */}
        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
          <button
            onClick={() => setHistoryTab("liked")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              historyTab === "liked"
                ? "bg-white dark:bg-gray-700 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <Heart className="h-4 w-4" />
            Liked ({likedArticles.length})
          </button>
          <button
            onClick={() => setHistoryTab("read")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              historyTab === "read"
                ? "bg-white dark:bg-gray-700 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Read ({readArticles.length})
          </button>
        </div>

        {/* Search & Filter */}
        <SearchFilter
          filters={filters}
          onFiltersChange={handleFiltersChange}
          availableSections={historySections}
        />

        {/* Results count when filtering */}
        {hasHistoryFilters && (
          <p className="text-sm text-gray-500 dark:text-gray-400 px-1">
            Showing {filteredHistory.length} of {historyArticles.length} articles
          </p>
        )}

        {/* Articles */}
        {filteredHistory.length > 0 ? (
          <div className="space-y-4">
            {filteredHistory.map((article) => (
              <ArticleCard
                key={article.uri}
                article={article}
                onRead={handleRead}
                onLike={handleLike}
                onSave={handleSave}
                onOpen={handleOpen}
                onFollowJournalist={handleFollowJournalist}
                onPreview={handlePreview}
                isLiked={historyTab === "liked" || likedArticleUris.has(article.uri)}
                isRead={historyTab === "read" || readArticleUris.has(article.uri)}
                isSaved={savedArticleUris.has(article.uri)}
                isSelected={false}
                isSelectable={false}
                isChecked={false}
                showRelevanceScore={false}
                followedJournalists={followedJournalists}
              />
            ))}
          </div>
        ) : hasHistoryFilters ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-12 w-12 text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No matches found</h2>
            <p className="text-gray-500">No articles match your filters</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchQuery("");
                clearGlobalFilters();
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {historyTab === "liked" ? (
              <>
                <Heart className="h-12 w-12 text-gray-300 mb-4" />
                <h2 className="text-xl font-semibold mb-2">No liked articles</h2>
                <p className="text-gray-500">Articles you like will appear here</p>
              </>
            ) : (
              <>
                <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
                <h2 className="text-xl font-semibold mb-2">No reading history</h2>
                <p className="text-gray-500">Articles you mark as read will appear here</p>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Stories section
  if (currentSection === "stories") {
    if (clustersLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <RefreshCw className="h-16 w-16 text-blue-400 mb-4 animate-spin" />
          <h2 className="text-xl font-semibold mb-2">Analyzing stories...</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Generating embeddings and clustering related articles. This may take a moment.
          </p>
        </div>
      );
    }

    if (storyClusters.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <Layers className="h-16 w-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No story clusters yet</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Story clustering uses AI to group related articles together.
          </p>
          {embeddingsStatus && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              {embeddingsStatus.withEmbeddings} of {embeddingsStatus.total} articles have embeddings
            </p>
          )}
          {settings.openaiApiKey ? (
            <Button onClick={generateClusters} disabled={clustersLoading}>
              <Layers className="w-4 h-4 mr-2" />
              Generate Story Clusters
            </Button>
          ) : (
            <Button onClick={onOpenSettings}>
              Add OpenAI API Key
            </Button>
          )}
        </div>
      );
    }

    // Helper functions for recency checks
    const isNewArticle = (publishedDate: string) => {
      const now = new Date();
      const published = new Date(publishedDate);
      const minutesAgo = (now.getTime() - published.getTime()) / (1000 * 60);
      return minutesAgo < 60;
    };

    const isTodayArticle = (publishedDate: string) => {
      const now = new Date();
      const published = new Date(publishedDate);
      return (
        published.getDate() === now.getDate() &&
        published.getMonth() === now.getMonth() &&
        published.getFullYear() === now.getFullYear()
      );
    };

    // Filter clusters based on filters
    const filteredClusters = storyClusters.filter((cluster) => {
      // Quick filter (NEW, 6H, or TODAY buttons)
      if (filters.quickFilter === "new") {
        if (!cluster.articles.some((a) => isNewArticle(a.publishedDate))) return false;
      } else if (filters.quickFilter === "6h") {
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
        if (!cluster.articles.some((a) => new Date(a.publishedDate) >= sixHoursAgo)) return false;
      } else if (filters.quickFilter === "today") {
        if (!cluster.articles.some((a) => isTodayArticle(a.publishedDate))) return false;
      }

      // Section filter
      if (filters.sections.length > 0) {
        if (!cluster.articles.some((a) => filters.sections.includes(a.section))) return false;
      }

      // Date range filter
      if (filters.dateRange !== "any") {
        const now = new Date();
        const hasMatchingArticle = cluster.articles.some((a) => {
          const published = new Date(a.publishedDate);
          if (filters.dateRange === "today") {
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return published >= today;
          } else if (filters.dateRange === "week") {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return published >= weekAgo;
          } else if (filters.dateRange === "month") {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return published >= monthAgo;
          }
          return true;
        });
        if (!hasMatchingArticle) return false;
      }

      // Search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase().trim();

        // Special tag searches
        if (query === "new") {
          return cluster.articles.some((a) => isNewArticle(a.publishedDate));
        }
        if (query === "today") {
          return cluster.articles.some((a) => isTodayArticle(a.publishedDate));
        }

        // Regular text search
        if (cluster.title.toLowerCase().includes(query)) return true;
        if (cluster.summary?.toLowerCase().includes(query)) return true;
        if (cluster.keywords.some((kw) => kw.toLowerCase().includes(query))) return true;
        if (cluster.articles.some((a) => a.title.toLowerCase().includes(query))) return true;
        if (cluster.articles.some((a) => a.byline.toLowerCase().includes(query))) return true;
        return false;
      }

      return true;
    });

    // Get unique sections from cluster articles for filter
    const clusterSections = [...new Set(storyClusters.flatMap((c) => c.articles.map((a) => a.section)))];

    return (
      <div className="space-y-4">
        {/* Search & Filter (same as For You) */}
        <SearchFilter
          filters={filters}
          onFiltersChange={handleFiltersChange}
          availableSections={clusterSections}
        />

        {/* Status bar */}
        <div className="flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400 py-2 px-1">
          <div className="flex items-center justify-between">
            <span>
              {filteredClusters.length} story clusters
              {(filters.searchQuery || filters.quickFilter) && ` (filtered from ${storyClusters.length})`}
              {" "}from {filteredClusters.reduce((sum, c) => sum + c.articles.length, 0)} articles
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={generateClusters}
              disabled={clustersLoading}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${clustersLoading ? "animate-spin" : ""}`} />
              Rebuild
            </Button>
          </div>
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              Last clustered: {lastClusterRefresh ? new Date(lastClusterRefresh).toLocaleTimeString() : "Not yet"}
            </span>
          </div>
        </div>

        {/* No results */}
        {filteredClusters.length === 0 && (filters.searchQuery || filters.quickFilter) && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No clusters match your filters
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setGlobalFilters({ quickFilter: null });
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Magazine-style story cards */}
        {filteredClusters.map((cluster) => (
          <MagazineStoryCard
            key={cluster.id}
            cluster={cluster}
            onLike={handleLike}
            onSave={handleSave}
            onRead={handleRead}
            onFollowJournalist={followJournalist}
            onUnfollowJournalist={unfollowJournalist}
            likedArticleUris={likedArticleUris}
            savedArticleUris={savedArticleUris}
            readArticleUris={readArticleUris}
            followedJournalists={followedJournalists}
          />
        ))}
      </div>
    );
  }

  // Discover section - high serendipity content
  if (currentSection === "discover") {
    const cache = getMasterCache();
    const discoveryArticles = cache
      ? rankForDiscovery(cache.articles, profile, readArticleUris)
      : [];

    return (
      <DiscoverFeed
        articles={discoveryArticles}
        onLike={handleLike}
        onSave={handleSave}
        onRead={handleRead}
        onOpen={handleOpen}
        likedArticleUris={likedArticleUris}
        savedArticleUris={savedArticleUris}
      />
    );
  }

  if (filteredArticles.length === 0 && currentSection !== "saved") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <Newspaper className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold mb-2">All caught up!</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You've read all the articles in this section. Check back later for
          more.
        </p>
        <Button onClick={() => fetchArticles(true)} variant="outline">
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <SearchFilter
        filters={filters}
        onFiltersChange={handleFiltersChange}
        availableSections={availableSections}
      />

      {/* Last refresh time */}
      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 px-1">
        <Clock className="w-3 h-3 mr-1" />
        Last refreshed: {lastRefresh ? new Date(lastRefresh).toLocaleTimeString() : "Not yet"}
      </div>

      {/* Bulk actions toolbar */}
      <div className="flex items-center gap-2 py-2 px-1">
        {/* View mode toggle */}
        <div className="flex items-center border rounded-lg overflow-hidden">
          <Button
            variant={viewMode === "newspaper" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("newspaper")}
            className="rounded-none gap-1.5"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Newspaper</span>
          </Button>
          <Button
            variant={viewMode === "card" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("card")}
            className="rounded-none gap-1.5"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">List</span>
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

        <Button
          variant={bulkMode ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setBulkMode(!bulkMode);
            if (bulkMode) setSelectedUris(new Set());
          }}
          className="gap-1.5"
        >
          {bulkMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          {bulkMode ? "Exit Select" : "Select"}
        </Button>

        {bulkMode && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={selectedUris.size === displayedArticles.length ? handleDeselectAll : handleSelectAll}
              className="gap-1.5"
            >
              {selectedUris.size === displayedArticles.length ? "Deselect All" : "Select All"}
            </Button>

            {selectedUris.size > 0 && (
              <>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedUris.size} selected
                </span>
                <div className="flex items-center gap-1 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkSave}
                    className="gap-1.5"
                  >
                    <BookmarkPlus className="w-4 h-4" />
                    Save All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkMarkRead}
                    className="gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Mark Read
                  </Button>
                </div>
              </>
            )}
          </>
        )}

      </div>

      {/* Results count when filtering */}
      {(filters.searchQuery || filters.sections.length > 0 || filters.readingTime !== "any" || filters.dateRange !== "any" || filters.quickFilter) && (
        <p className="text-sm text-gray-500 dark:text-gray-400 px-1">
          Showing {displayedArticles.length} of {baseArticles.length} articles
        </p>
      )}

      {/* No results message */}
      {displayedArticles.length === 0 && baseArticles.length > 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No articles match your filters
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              clearGlobalFilters();
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Article display - Newspaper or Card view */}
      {viewMode === "newspaper" && !bulkMode ? (
        <NewspaperLayout
          layout={categorizeForNewspaper(displayedArticles as any)}
          onRead={handleRead}
          onDismiss={handleDismiss}
          onLike={handleLike}
          onSave={handleSave}
          onOpen={handleOpen}
          onFollowJournalist={handleFollowJournalist}
          likedArticleUris={likedArticleUris}
          savedArticleUris={savedArticleUris}
          followedJournalists={followedJournalists}
          showRelevanceScore={currentSection === "for-you"}
        />
      ) : (
        /* Card list view */
        displayedArticles.map((article, index) => (
          <div
            key={article.uri}
            ref={(el) => {
              if (el) articleRefs.current.set(index, el);
              else articleRefs.current.delete(index);
            }}
          >
            <ArticleCard
              article={article}
              onRead={handleRead}
              onLike={handleLike}
              onSave={handleSave}
              onDismiss={currentSection === "saved" ? handleDismissFromSaved : handleDismiss}
              onOpen={handleOpen}
              onFollowJournalist={handleFollowJournalist}
              onPreview={handlePreview}
              onSelect={handleSelectArticle}
              isLiked={likedArticleUris.has(article.uri)}
              isSaved={savedArticleUris.has(article.uri)}
              isSelected={selectedIndex === index}
              isSelectable={bulkMode}
              isChecked={selectedUris.has(article.uri)}
              showRelevanceScore={currentSection === "for-you"}
              followedJournalists={followedJournalists}
            />
          </div>
        ))
      )}

      {/* Article Preview Modal */}
      <ArticlePreview
        article={previewArticle}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onRead={handleRead}
        onLike={handleLike}
        onSave={handleSave}
        isLiked={previewArticle ? likedArticleUris.has(previewArticle.uri) : false}
        isSaved={previewArticle ? savedArticleUris.has(previewArticle.uri) : false}
      />

    </div>
  );
}
