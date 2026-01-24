"use client";

import { useEffect, useCallback, useRef } from "react";
import { useAppStore } from "./store";

// Schedule intervals in milliseconds
const SCHEDULE = {
  embeddings: 3 * 60 * 60 * 1000, // Every 3 hours (with story rebuild)
  storyRebuild: 3 * 60 * 60 * 1000, // Every 3 hours (8x/day)
  profileAnalysis: 12 * 60 * 60 * 1000, // Every 12 hours (2x/day)
};

// Local storage keys for last run times
const STORAGE_KEYS = {
  lastEmbeddings: "nyt-reader-last-embeddings",
  lastStoryRebuild: "nyt-reader-last-story-rebuild",
  lastProfileAnalysis: "nyt-reader-last-profile-analysis",
};

function getLastRun(key: string): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem(key);
  return stored ? parseInt(stored, 10) : 0;
}

function setLastRun(key: string, time: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, time.toString());
}

interface SchedulerCallbacks {
  onEmbeddingsNeeded?: () => Promise<void>;
  onStoryRebuildNeeded?: () => Promise<void>;
  onProfileAnalysisNeeded?: () => Promise<void>;
}

export function useAutoScheduler(callbacks: SchedulerCallbacks) {
  const { settings } = useAppStore();
  const isRunning = useRef(false);

  const checkAndRunTasks = useCallback(async () => {
    // Prevent concurrent runs
    if (isRunning.current) return;
    isRunning.current = true;

    const now = Date.now();

    try {
      // Check embeddings + story rebuild (they go together)
      if (settings.openaiApiKey) {
        const lastStoryRebuild = getLastRun(STORAGE_KEYS.lastStoryRebuild);
        const timeSinceRebuild = now - lastStoryRebuild;

        if (timeSinceRebuild >= SCHEDULE.storyRebuild) {
          console.log("[AutoScheduler] Running scheduled story rebuild...");

          // First run embeddings for new articles
          if (callbacks.onEmbeddingsNeeded) {
            await callbacks.onEmbeddingsNeeded();
            setLastRun(STORAGE_KEYS.lastEmbeddings, now);
          }

          // Then rebuild clusters
          if (callbacks.onStoryRebuildNeeded) {
            await callbacks.onStoryRebuildNeeded();
            setLastRun(STORAGE_KEYS.lastStoryRebuild, now);
          }
        }

        // Check profile analysis (separate schedule)
        const lastProfileAnalysis = getLastRun(STORAGE_KEYS.lastProfileAnalysis);
        const timeSinceAnalysis = now - lastProfileAnalysis;

        if (timeSinceAnalysis >= SCHEDULE.profileAnalysis) {
          console.log("[AutoScheduler] Running scheduled profile analysis...");
          if (callbacks.onProfileAnalysisNeeded) {
            await callbacks.onProfileAnalysisNeeded();
            setLastRun(STORAGE_KEYS.lastProfileAnalysis, now);
          }
        }
      }
    } catch (error) {
      console.error("[AutoScheduler] Error running scheduled tasks:", error);
    } finally {
      isRunning.current = false;
    }
  }, [settings.openaiApiKey, callbacks]);

  // Run on mount and when switching back to the app
  useEffect(() => {
    // Initial check
    checkAndRunTasks();

    // Check when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAndRunTasks();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Also check periodically while app is open (every 30 minutes)
    const interval = setInterval(checkAndRunTasks, 30 * 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [checkAndRunTasks]);

  // Return function to manually trigger checks
  return { checkAndRunTasks };
}

// Helper to get time until next scheduled run
export function getScheduleStatus(): {
  storyRebuild: { lastRun: Date | null; nextRun: Date };
  profileAnalysis: { lastRun: Date | null; nextRun: Date };
} {
  const now = Date.now();

  const lastStoryRebuild = getLastRun(STORAGE_KEYS.lastStoryRebuild);
  const lastProfileAnalysis = getLastRun(STORAGE_KEYS.lastProfileAnalysis);

  return {
    storyRebuild: {
      lastRun: lastStoryRebuild ? new Date(lastStoryRebuild) : null,
      nextRun: new Date(lastStoryRebuild + SCHEDULE.storyRebuild),
    },
    profileAnalysis: {
      lastRun: lastProfileAnalysis ? new Date(lastProfileAnalysis) : null,
      nextRun: new Date(lastProfileAnalysis + SCHEDULE.profileAnalysis),
    },
  };
}

// Force a task to run now (resets the schedule)
export function forceRunNow(task: "storyRebuild" | "profileAnalysis"): void {
  const key = task === "storyRebuild"
    ? STORAGE_KEYS.lastStoryRebuild
    : STORAGE_KEYS.lastProfileAnalysis;
  // Set to 0 so next check will trigger it
  setLastRun(key, 0);
}
