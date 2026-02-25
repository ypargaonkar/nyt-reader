"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, HelpCircle, BarChart3 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useMorphStore } from "@/lib/games/morph-store";
import { getDictionary, getGraph } from "@/lib/games/morph-dictionary";
import { getTodaysPuzzle, getPuzzleNumber } from "@/lib/games/morph-puzzles";
import { generateRandomPuzzle, type WordGraph } from "@/lib/games/morph-engine";
import { loadWords } from "@/lib/games/morph-dictionary";
import { MorphBoard } from "./MorphBoard";
import { MorphHowToPlay } from "./MorphHowToPlay";
import { MorphStats } from "./MorphStats";
import { MorphShare } from "./MorphShare";

export function MorphGame() {
  const [dictionary, setDictionary] = useState<Set<string> | null>(null);
  const [graph, setGraph] = useState<WordGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showWinState, setShowWinState] = useState(false);

  const { currentPuzzle, gameStatus, startGame, shufflePuzzle, stats } = useMorphStore();

  // Load dictionary, graph, and puzzle on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setLoading(true);
        const [dict, g, puzzle] = await Promise.all([
          getDictionary(),
          getGraph(),
          getTodaysPuzzle(),
        ]);

        if (cancelled) return;

        setDictionary(dict);
        setGraph(g);
        startGame(puzzle);

        // Show how to play on first ever visit
        if (stats.gamesPlayed === 0) {
          setShowHowToPlay(true);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load game");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleWin = () => {
    setShowWinState(true);
    // Small delay then show stats
    setTimeout(() => setShowStats(true), 800);
  };

  const handleShuffle = async () => {
    if (!graph) return;
    const words = await loadWords();
    const puzzle = generateRandomPuzzle(words, graph);
    if (puzzle) {
      shufflePuzzle(puzzle);
      setShowWinState(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading Morph...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <p className="text-red-500">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!dictionary || !graph || !currentPuzzle) return null;

  const puzzleNumber = getPuzzleNumber(currentPuzzle.date);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 dark:bg-gray-950/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-950/60">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/games">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-serif text-lg font-bold tracking-tight">
                  Morph
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  #{puzzleNumber}
                  {currentPuzzle.theme && ` · ${currentPuzzle.theme}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setShowHowToPlay(true)}
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setShowStats(true)}
              >
                <BarChart3 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Game Area */}
      <main className="container mx-auto px-4 py-6">
        <MorphBoard
          graph={graph}
          dictionary={dictionary}
          onWin={handleWin}
          onShuffle={handleShuffle}
        />

        {/* Share card (shown after win) */}
        {(gameStatus === "won" || showWinState) && gameStatus !== "playing" && (
          <div className="mt-6 max-w-sm mx-auto">
            <MorphShare graph={graph} />
          </div>
        )}
      </main>

      {/* Dialogs */}
      <MorphHowToPlay open={showHowToPlay} onOpenChange={setShowHowToPlay} />
      <MorphStats open={showStats} onOpenChange={setShowStats} />
    </div>
  );
}
