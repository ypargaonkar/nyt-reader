"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Article, FeedSection, UserProfile, ApiUsage } from "./types";

interface Settings {
  nytApiKey: string;
  openaiApiKey: string;
  darkMode: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // minutes
  cacheDuration: number; // minutes - how long to cache section data
}

// Global filters that persist across tabs (search is local per tab)
interface GlobalFilters {
  sections: string[];
  readingTime: "any" | "quick" | "medium" | "long";
  dateRange: "any" | "today" | "week" | "month";
  quickFilter: "new" | "6h" | "today" | null;
}

interface MasterCache {
  articles: Article[];
  fetchedAt: number; // timestamp
}

interface AppState {
  // Feed state
  masterCache: MasterCache | null; // ALL articles from API
  filteredArticles: Article[];
  currentSection: FeedSection;
  loading: boolean;
  error: string | null;
  lastRefresh: string | null;
  lastClusterRefresh: string | null;

  // User data
  readArticleUris: Set<string>;
  likedArticleUris: Set<string>;
  savedArticleUris: Set<string>;
  dismissedArticles: Record<string, number>; // uri -> dismissedAt timestamp (kept for 30 days)
  followedJournalists: Set<string>;
  profile: UserProfile | null;

  // API usage
  apiUsage: ApiUsage;

  // Settings
  settings: Settings;

  // Global filters (persist across tabs)
  globalFilters: GlobalFilters;

  // Actions
  setMasterCache: (articles: Article[]) => void;
  setFilteredArticles: (articles: Article[]) => void;
  setCurrentSection: (section: FeedSection) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastRefresh: (time: string) => void;
  setLastClusterRefresh: (time: string) => void;

  // Cache actions
  getMasterCache: () => MasterCache | null;
  isCacheValid: () => boolean;
  clearCache: () => void;

  markAsRead: (uri: string) => void;
  markAsLiked: (uri: string) => void;
  saveArticle: (uri: string) => void;
  unsaveArticle: (uri: string) => void;
  dismissArticle: (uri: string) => void;
  removeArticle: (uri: string) => void;
  removeFromMasterCache: (uri: string) => void;

  setProfile: (profile: UserProfile) => void;
  setApiUsage: (usage: ApiUsage) => void;

  updateSettings: (settings: Partial<Settings>) => void;

  // Global filters
  setGlobalFilters: (filters: Partial<GlobalFilters>) => void;
  clearGlobalFilters: () => void;

  // Hydration
  setReadArticleUris: (uris: Set<string>) => void;
  setLikedArticleUris: (uris: Set<string>) => void;
  setDismissedArticles: (dismissed: Record<string, number>) => void;
  setSavedArticleUris: (uris: Set<string>) => void;
  setFollowedJournalists: (names: Set<string>) => void;

  // Journalist follow actions
  followJournalist: (name: string) => void;
  unfollowJournalist: (name: string) => void;
  isJournalistFollowed: (name: string) => boolean;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      masterCache: null,
      filteredArticles: [],
      currentSection: "for-you",
      loading: false,
      error: null,
      lastRefresh: null,
      lastClusterRefresh: null,

      readArticleUris: new Set(),
      likedArticleUris: new Set(),
      savedArticleUris: new Set(),
      dismissedArticles: {},
      followedJournalists: new Set(),
      profile: null,

      apiUsage: {
        todayCalls: 0,
        lastCallTime: 0,
        dailyLimit: 500,
        minuteLimit: 5,
      },

      settings: {
        nytApiKey: "",
        openaiApiKey: "",
        darkMode: false,
        autoRefresh: true,
        refreshInterval: 8,
        cacheDuration: 8, // Cache duration in minutes
      },

      globalFilters: {
        sections: [],
        readingTime: "any",
        dateRange: "any",
        quickFilter: "6h",
      },

      // Actions
      setMasterCache: (articles) => {
        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

        // Clean up old dismissed articles (older than 30 days)
        const dismissed = get().dismissedArticles;
        const cleanedDismissed: Record<string, number> = {};
        for (const [uri, timestamp] of Object.entries(dismissed)) {
          if (timestamp > thirtyDaysAgo) {
            cleanedDismissed[uri] = timestamp;
          }
        }

        // Filter out dismissed articles
        const filteredArticles = articles.filter((a) => !(a.uri in cleanedDismissed));

        set({
          masterCache: {
            articles: filteredArticles,
            fetchedAt: now,
          },
          dismissedArticles: cleanedDismissed,
        });
      },

      setFilteredArticles: (articles) => set({ filteredArticles: articles }),

      setCurrentSection: (section) => set({ currentSection: section }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      setLastRefresh: (time) => set({ lastRefresh: time }),

      setLastClusterRefresh: (time) => set({ lastClusterRefresh: time }),

      // Cache actions
      getMasterCache: () => {
        return get().masterCache;
      },

      isCacheValid: () => {
        const cache = get().masterCache;
        if (!cache) return false;

        const cacheDurationMs = get().settings.cacheDuration * 60 * 1000;
        const cacheAge = Date.now() - cache.fetchedAt;
        return cacheAge < cacheDurationMs;
      },

      clearCache: () => {
        set({ masterCache: null });
      },

      markAsRead: (uri) => {
        const newSet = new Set(get().readArticleUris);
        newSet.add(uri);
        set({ readArticleUris: newSet });

        // Remove from filtered articles
        const filtered = get().filteredArticles.filter((a) => a.uri !== uri);
        set({ filteredArticles: filtered });

        // Also remove from master cache
        get().removeFromMasterCache(uri);
      },

      markAsLiked: (uri) => {
        const newSet = new Set(get().likedArticleUris);
        newSet.add(uri);
        set({ likedArticleUris: newSet });
      },

      saveArticle: (uri) => {
        const newSet = new Set(get().savedArticleUris);
        newSet.add(uri);
        set({ savedArticleUris: newSet });

        // Remove from filtered articles (moves to saved section)
        const filtered = get().filteredArticles.filter((a) => a.uri !== uri);
        set({ filteredArticles: filtered });
      },

      unsaveArticle: (uri) => {
        const newSet = new Set(get().savedArticleUris);
        newSet.delete(uri);
        set({ savedArticleUris: newSet });
      },

      dismissArticle: (uri) => {
        // Add to dismissed with timestamp (kept for 30 days)
        const newDismissed = { ...get().dismissedArticles, [uri]: Date.now() };
        set({ dismissedArticles: newDismissed });

        // Remove from filtered articles
        const filtered = get().filteredArticles.filter((a) => a.uri !== uri);
        set({ filteredArticles: filtered });

        // Also remove from master cache
        get().removeFromMasterCache(uri);
      },

      removeArticle: (uri) => {
        const filtered = get().filteredArticles.filter((a) => a.uri !== uri);
        set({ filteredArticles: filtered });
      },

      removeFromMasterCache: (uri) => {
        const cache = get().masterCache;
        if (cache) {
          set({
            masterCache: {
              ...cache,
              articles: cache.articles.filter((a) => a.uri !== uri),
            },
          });
        }
      },

      setProfile: (profile) => set({ profile }),

      setApiUsage: (usage) => set({ apiUsage: usage }),

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      setGlobalFilters: (newFilters) =>
        set((state) => ({
          globalFilters: { ...state.globalFilters, ...newFilters },
        })),

      clearGlobalFilters: () =>
        set({
          globalFilters: {
            sections: [],
            readingTime: "any",
            dateRange: "any",
            quickFilter: "6h",
          },
        }),

      setReadArticleUris: (uris) => set({ readArticleUris: uris }),

      setLikedArticleUris: (uris) => set({ likedArticleUris: uris }),

      setSavedArticleUris: (uris) => set({ savedArticleUris: uris }),

      setDismissedArticles: (dismissed) => set({ dismissedArticles: dismissed }),

      setFollowedJournalists: (names) => set({ followedJournalists: names }),

      followJournalist: (name) => {
        const newSet = new Set(get().followedJournalists);
        newSet.add(name);
        set({ followedJournalists: newSet });
      },

      unfollowJournalist: (name) => {
        const newSet = new Set(get().followedJournalists);
        newSet.delete(name);
        set({ followedJournalists: newSet });
      },

      isJournalistFollowed: (name) => {
        return get().followedJournalists.has(name);
      },
    }),
    {
      name: "nyt-reader-storage",
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Partial<AppState>;
        if (version < 2) {
          // Migrate to v2: set 6h as default quickFilter
          return {
            ...state,
            globalFilters: {
              ...state.globalFilters,
              sections: state.globalFilters?.sections ?? [],
              readingTime: state.globalFilters?.readingTime ?? "any",
              dateRange: state.globalFilters?.dateRange ?? "any",
              quickFilter: "6h",
            },
          };
        }
        return state;
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AppState>;
        return {
          ...currentState,
          ...persisted,
          globalFilters: {
            ...currentState.globalFilters,
            ...persisted.globalFilters,
          },
          settings: {
            ...currentState.settings,
            ...persisted.settings,
          },
        };
      },
      partialize: (state) => ({
        settings: state.settings,
        currentSection: state.currentSection,
        globalFilters: state.globalFilters,
        dismissedArticles: state.dismissedArticles,
      }),
    }
  )
);

// Selector hooks for common patterns
export const useArticles = () => useAppStore((state) => state.filteredArticles);
export const useLoading = () => useAppStore((state) => state.loading);
export const useError = () => useAppStore((state) => state.error);
export const useCurrentSection = () => useAppStore((state) => state.currentSection);
export const useSettings = () => useAppStore((state) => state.settings);
export const useProfile = () => useAppStore((state) => state.profile);
export const useApiUsage = () => useAppStore((state) => state.apiUsage);
export const useFollowedJournalists = () => useAppStore((state) => state.followedJournalists);
export const useSavedArticleUris = () => useAppStore((state) => state.savedArticleUris);
export const useGlobalFilters = () => useAppStore((state) => state.globalFilters);
