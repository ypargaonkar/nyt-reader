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

  // User data
  readArticleUris: Set<string>;
  likedArticleUris: Set<string>;
  savedArticleUris: Set<string>;
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

  // Cache actions
  getMasterCache: () => MasterCache | null;
  isCacheValid: () => boolean;
  clearCache: () => void;

  markAsRead: (uri: string) => void;
  markAsLiked: (uri: string) => void;
  saveArticle: (uri: string) => void;
  unsaveArticle: (uri: string) => void;
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

      readArticleUris: new Set(),
      likedArticleUris: new Set(),
      savedArticleUris: new Set(),
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
        refreshInterval: 15,
        cacheDuration: 15, // Cache duration in minutes
      },

      globalFilters: {
        sections: [],
        readingTime: "any",
        dateRange: "any",
        quickFilter: "6h",
      },

      // Actions
      setMasterCache: (articles) => {
        set({
          masterCache: {
            articles,
            fetchedAt: Date.now(),
          },
        });
      },

      setFilteredArticles: (articles) => set({ filteredArticles: articles }),

      setCurrentSection: (section) => set({ currentSection: section }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      setLastRefresh: (time) => set({ lastRefresh: time }),

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
      },

      unsaveArticle: (uri) => {
        const newSet = new Set(get().savedArticleUris);
        newSet.delete(uri);
        set({ savedArticleUris: newSet });
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
      partialize: (state) => ({
        settings: state.settings,
        currentSection: state.currentSection,
        globalFilters: state.globalFilters,
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
