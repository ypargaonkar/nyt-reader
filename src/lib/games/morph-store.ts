"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MorphPuzzle } from "./morph-puzzles";

interface MorphStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string | null;
  scoreDistribution: Record<string, number>; // "-2": 1, "-1": 3, "0": 5, etc.
  averageSteps: number;
  bestScore: number;
}

interface MorphGameState {
  // Current game
  currentPuzzle: MorphPuzzle | null;
  chain: string[];
  gameStatus: "playing" | "won" | "gave-up";
  hintsUsed: number;
  startTime: number | null;
  endTime: number | null;

  // Statistics (persisted)
  stats: MorphStats;

  // Actions
  startGame: (puzzle: MorphPuzzle) => void;
  addWord: (word: string) => void;
  undoLastWord: () => void;
  useHintWord: (word: string) => void;
  winGame: () => void;
  giveUp: () => void;
  resetGame: () => void;
}

const defaultStats: MorphStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastPlayedDate: null,
  scoreDistribution: {},
  averageSteps: 0,
  bestScore: 999,
};

export const useMorphStore = create<MorphGameState>()(
  persist(
    (set, get) => ({
      currentPuzzle: null,
      chain: [],
      gameStatus: "playing",
      hintsUsed: 0,
      startTime: null,
      endTime: null,
      stats: defaultStats,

      startGame: (puzzle) => {
        const state = get();
        // If already playing today's puzzle and not resetting, don't restart
        if (
          state.currentPuzzle?.date === puzzle.date &&
          state.gameStatus !== "playing"
        ) {
          return;
        }
        // If puzzle date matches and chain exists, resume
        if (
          state.currentPuzzle?.date === puzzle.date &&
          state.chain.length > 0
        ) {
          return;
        }
        set({
          currentPuzzle: puzzle,
          chain: [puzzle.start],
          gameStatus: "playing",
          hintsUsed: 0,
          startTime: Date.now(),
          endTime: null,
        });
      },

      addWord: (word) => {
        set((state) => ({
          chain: [...state.chain, word.toLowerCase()],
        }));
      },

      undoLastWord: () => {
        const state = get();
        if (state.chain.length <= 1) return; // Can't undo the start word
        set({
          chain: state.chain.slice(0, -1),
        });
      },

      useHintWord: (word) => {
        set((state) => ({
          chain: [...state.chain, word.toLowerCase()],
          hintsUsed: state.hintsUsed + 1,
        }));
      },

      winGame: () => {
        const state = get();
        if (!state.currentPuzzle || state.gameStatus !== "playing") return;

        const steps = state.chain.length - 1; // exclude start word
        const stepsOverPar = steps - state.currentPuzzle.par;
        const now = Date.now();
        const today = new Date().toISOString().split("T")[0];

        const stats = { ...state.stats };
        stats.gamesPlayed += 1;
        stats.gamesWon += 1;

        // Streak logic
        if (stats.lastPlayedDate) {
          const lastDate = new Date(stats.lastPlayedDate);
          const todayDate = new Date(today);
          const diffDays = Math.floor(
            (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diffDays === 1) {
            stats.currentStreak += 1;
          } else if (diffDays > 1) {
            stats.currentStreak = 1;
          }
          // diffDays === 0 means same day, streak stays the same
        } else {
          stats.currentStreak = 1;
        }
        stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
        stats.lastPlayedDate = today;

        // Score distribution
        const scoreKey = String(stepsOverPar);
        stats.scoreDistribution = {
          ...stats.scoreDistribution,
          [scoreKey]: (stats.scoreDistribution[scoreKey] || 0) + 1,
        };

        // Average steps
        const totalStepsBefore =
          stats.averageSteps * (stats.gamesPlayed - 1);
        stats.averageSteps =
          (totalStepsBefore + steps) / stats.gamesPlayed;

        // Best score
        stats.bestScore = Math.min(stats.bestScore, stepsOverPar);

        set({
          gameStatus: "won",
          endTime: now,
          stats,
        });
      },

      giveUp: () => {
        const state = get();
        if (!state.currentPuzzle || state.gameStatus !== "playing") return;

        const today = new Date().toISOString().split("T")[0];
        const stats = { ...state.stats };
        stats.gamesPlayed += 1;

        // Break streak
        if (stats.lastPlayedDate) {
          const lastDate = new Date(stats.lastPlayedDate);
          const todayDate = new Date(today);
          const diffDays = Math.floor(
            (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diffDays >= 1) {
            stats.currentStreak = 0;
          }
        }
        stats.lastPlayedDate = today;

        set({
          gameStatus: "gave-up",
          endTime: Date.now(),
          stats,
        });
      },

      resetGame: () => {
        const state = get();
        if (!state.currentPuzzle) return;
        set({
          chain: [state.currentPuzzle.start],
          gameStatus: "playing",
          hintsUsed: 0,
          startTime: Date.now(),
          endTime: null,
        });
      },
    }),
    {
      name: "morph-game-storage",
      partialize: (state) => ({
        currentPuzzle: state.currentPuzzle,
        chain: state.chain,
        gameStatus: state.gameStatus,
        hintsUsed: state.hintsUsed,
        startTime: state.startTime,
        endTime: state.endTime,
        stats: state.stats,
      }),
    }
  )
);
