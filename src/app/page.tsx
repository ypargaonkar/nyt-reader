"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { SectionTabs } from "@/components/SectionTabs";
import { Feed } from "@/components/Feed";
import { SettingsDialog } from "@/components/SettingsDialog";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { PullToRefresh } from "@/components/PullToRefresh";
import { SwipeableSections } from "@/components/SwipeableSections";
import { WelcomePage } from "@/components/WelcomePage";
import { useAppStore } from "@/lib/store";
import type { FeedSection } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    currentSection,
    setCurrentSection,
    settings,
    setLoading,
    setMasterCache,
    setFilteredArticles,
    setError,
    setLastRefresh,
    clearCache,
  } = useAppStore();

  // Track mount state for hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Apply theme mode on mount and changes
  useEffect(() => {
    const applyTheme = () => {
      const themeMode = settings.themeMode || "system";

      if (themeMode === "system") {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.classList.toggle("dark", isDark);
      } else {
        document.documentElement.classList.toggle("dark", themeMode === "dark");
      }
    };

    applyTheme();

    // Listen for system theme changes when in system mode
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (settings.themeMode === "system") {
        applyTheme();
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [settings.themeMode]);

  // Handle section change
  const handleSectionChange = (section: FeedSection) => {
    setCurrentSection(section);
  };

  // Handle refresh (force refresh - bypasses cache)
  const handleRefresh = useCallback(async () => {
    if (!settings.nytApiKey) {
      setSettingsOpen(true);
      return;
    }

    setIsRefreshing(true);
    setLoading(true);
    setError(null);

    try {
      // Clear cache to force fresh fetch
      clearCache();

      const res = await fetch(
        `/api/articles?section=for-you&refresh=true`,
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

      // Update master cache with fresh data
      setMasterCache(data.articles);
      setFilteredArticles(data.articles);
      setLastRefresh(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch articles");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [
    settings.nytApiKey,
    setLoading,
    setError,
    setMasterCache,
    setFilteredArticles,
    setLastRefresh,
    clearCache,
  ]);

  // Auto-refresh
  useEffect(() => {
    if (!settings.autoRefresh || !settings.nytApiKey) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, settings.refreshInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [settings.autoRefresh, settings.refreshInterval, settings.nytApiKey, handleRefresh]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "r":
        case "R":
          if (!e.metaKey && !e.ctrlKey) {
            handleRefresh();
          }
          break;
        case ",":
          setSettingsOpen(true);
          break;
        case "?":
          setShortcutsOpen(true);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRefresh]);

  // Show welcome page if no API key is configured (after hydration)
  if (mounted && !settings.nytApiKey) {
    return <WelcomePage />;
  }

  // Show loading state during hydration to avoid flash
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header onRefresh={handleRefresh} isRefreshing={isRefreshing} />

      {/* Desktop: Show section tabs, Mobile: Hidden (uses bottom nav) */}
      <div className="hidden md:block">
        <SectionTabs
          currentSection={currentSection}
          onSectionChange={handleSectionChange}
        />
      </div>

      <SwipeableSections
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
      >
        <PullToRefresh onRefresh={handleRefresh} disabled={isRefreshing}>
          <main className="w-full px-4 md:px-8 lg:px-12 py-6 pb-bottom-nav md:pb-6">
            <Feed onOpenSettings={() => setSettingsOpen(true)} />
          </main>
        </PullToRefresh>
      </SwipeableSections>

      {/* Mobile bottom navigation */}
      <MobileBottomNav
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
      />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {/* Keyboard shortcuts hint - hidden on mobile */}
      <div className="fixed bottom-4 right-4 text-xs text-gray-400 dark:text-gray-600 hidden md:block">
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">j</kbd>/<kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">k</kbd> Navigate
        <span className="mx-2">|</span>
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">o</kbd> Open
        <span className="mx-2">|</span>
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">l</kbd> Like
        <span className="mx-2">|</span>
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">s</kbd> Save
        <span className="mx-2">|</span>
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">?</kbd> Help
      </div>
    </div>
  );
}
