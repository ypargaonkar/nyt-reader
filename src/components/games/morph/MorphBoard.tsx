"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Undo2, Lightbulb, Flag, RotateCcw, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMorphStore } from "@/lib/games/morph-store";
import {
  isValidMove,
  getDistance,
  getDistanceColor,
  findShortestPath,
  getScoreLabel,
  getScoreLabelColor,
  type WordGraph,
} from "@/lib/games/morph-engine";

interface MorphBoardProps {
  graph: WordGraph;
  dictionary: Set<string>;
  onWin: () => void;
  onShuffle?: () => void;
}

export function MorphBoard({ graph, dictionary, onWin, onShuffle }: MorphBoardProps) {
  const {
    currentPuzzle,
    chain,
    gameStatus,
    hintsUsed,
    addWord,
    undoLastWord,
    useHintWord,
    winGame,
    giveUp,
    resetGame,
  } = useMorphStore();

  const [input, setInput] = useState(["", "", "", ""]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const lastWord = chain[chain.length - 1];

  // Pre-fill input from the last word whenever the chain changes
  useEffect(() => {
    if (gameStatus === "playing" && lastWord) {
      setInput(lastWord.split(""));
      setActiveIndex(null);
    }
  }, [chain.length, gameStatus]);

  const triggerShake = (msg: string) => {
    setError(msg);
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
    setTimeout(() => setError(null), 2000);
  };

  const handleSubmit = useCallback(() => {
    if (!currentPuzzle || gameStatus !== "playing") return;

    const word = input.join("").toLowerCase();
    if (word.length !== 4 || input.some((l) => !l)) {
      triggerShake("Fill in all 4 letters");
      return;
    }

    if (word === lastWord) {
      triggerShake("Change one letter");
      return;
    }

    const result = isValidMove(lastWord, word, dictionary);
    if (!result.valid) {
      triggerShake(result.reason || "Invalid move");
      return;
    }

    addWord(word);
    setError(null);
    setActiveIndex(null);

    // Check win
    if (word === currentPuzzle.target) {
      winGame();
      onWin();
    }
  }, [input, lastWord, currentPuzzle, gameStatus, dictionary, addWord, winGame, onWin]);

  const handleLetterClick = (index: number) => {
    if (gameStatus !== "playing") return;
    setActiveIndex(index);
    // Clear the letter at this position to indicate editing
    const newInput = lastWord.split("");
    newInput[index] = "";
    setInput(newInput);
    setTimeout(() => inputRefs.current[index]?.focus(), 0);
  };

  const handleInputChange = (index: number, value: string) => {
    if (gameStatus !== "playing") return;
    const letter = value.slice(-1).toLowerCase();
    if (letter && !/^[a-z]$/.test(letter)) return;

    const newInput = [...input];
    newInput[index] = letter || "";
    setInput(newInput);

    // Auto-submit if a letter was typed and all positions are filled
    if (letter) {
      const candidate = newInput.join("").toLowerCase();
      if (candidate.length === 4 && newInput.every((l) => l)) {
        // Small delay so the user sees the letter appear
        setTimeout(() => {
          if (candidate === lastWord) {
            triggerShake("Change one letter");
            return;
          }
          const result = isValidMove(lastWord, candidate, dictionary);
          if (!result.valid) {
            triggerShake(result.reason || "Invalid move");
            return;
          }
          addWord(candidate);
          setError(null);
          setActiveIndex(null);
          if (currentPuzzle && candidate === currentPuzzle.target) {
            winGame();
            onWin();
          }
        }, 100);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      // Reset this position to the original letter
      const newInput = [...input];
      newInput[index] = "";
      setInput(newInput);
    }
    if (e.key === "Escape") {
      // Cancel editing, restore from lastWord
      setInput(lastWord.split(""));
      setActiveIndex(null);
      inputRefs.current[index]?.blur();
    }
    if (e.key === "Enter") {
      handleSubmit();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      handleLetterClick(index - 1);
    }
    if (e.key === "ArrowRight" && index < 3) {
      handleLetterClick(index + 1);
    }
  };

  const handleHint = () => {
    if (!currentPuzzle || gameStatus !== "playing") return;
    const path = findShortestPath(lastWord, currentPuzzle.target, graph);
    if (path && path.length > 1) {
      const nextWord = path[1];
      useHintWord(nextWord);
      setActiveIndex(null);

      if (nextWord === currentPuzzle.target) {
        winGame();
        onWin();
      }
    }
  };

  const handleUndo = () => {
    if (chain.length <= 1 || gameStatus !== "playing") return;
    undoLastWord();
    setActiveIndex(null);
  };

  if (!currentPuzzle) return null;

  const steps = chain.length - 1;
  const stepsOverPar = steps - currentPuzzle.par;
  const isWon = gameStatus === "won";
  const isGaveUp = gameStatus === "gave-up";
  const isFinished = isWon || isGaveUp;

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      {/* Header: Par + Step Counter */}
      <div className="flex items-center justify-between w-full px-2">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Par <span className="font-bold text-gray-900 dark:text-white">{currentPuzzle.par}</span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Steps:{" "}
          <span className="font-bold text-gray-900 dark:text-white">{steps}</span>
        </div>
      </div>

      {/* Word Chain */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        {chain.map((word, i) => {
          const dist = getDistance(word, currentPuzzle.target, graph);
          const colorClass = getDistanceColor(dist);
          const isStart = i === 0;
          const isTarget = word === currentPuzzle.target;

          return (
            <div key={`${i}-${word}`} className="flex items-center gap-2 w-full justify-center">
              <div
                className={cn(
                  "w-3 h-3 rounded-full shrink-0 transition-colors",
                  colorClass
                )}
              />
              <div className="flex gap-1">
                {word.split("").map((letter, j) => {
                  const prevWord = i > 0 ? chain[i - 1] : null;
                  const isChanged = prevWord ? prevWord[j] !== letter : false;

                  return (
                    <div
                      key={j}
                      className={cn(
                        "w-10 h-10 flex items-center justify-center rounded-md font-mono text-lg font-bold uppercase transition-all",
                        isTarget
                          ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-2 border-amber-400"
                          : isStart
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700",
                        isChanged && !isTarget && "ring-2 ring-purple-400 dark:ring-purple-500"
                      )}
                    >
                      {letter}
                    </div>
                  );
                })}
              </div>
              <span className="text-xs text-gray-400 w-12 shrink-0">
                {isStart ? "START" : isTarget ? "DONE!" : `#${i}`}
              </span>
            </div>
          );
        })}

        {/* Active input row — pre-filled from last word, tap any letter to change it */}
        {gameStatus === "playing" && (
          <div className="flex items-center gap-2 w-full justify-center">
            <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
            <div className={cn("flex gap-1", shaking && "animate-shake")}>
              {input.map((letter, i) => {
                const isEditing = activeIndex === i;
                const isUnchanged = letter === lastWord[i];
                return isEditing ? (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="text"
                    autoCapitalize="none"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={letter}
                    onChange={(e) => handleInputChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onBlur={() => {
                      // Restore original letter if left empty
                      if (!input[i]) {
                        const restored = [...input];
                        restored[i] = lastWord[i];
                        setInput(restored);
                      }
                      setActiveIndex(null);
                    }}
                    className={cn(
                      "w-10 h-10 text-center rounded-md font-mono text-lg font-bold uppercase",
                      "bg-white dark:bg-gray-900 border-2 border-blue-500 dark:border-blue-400",
                      "focus:outline-none ring-2 ring-blue-300 dark:ring-blue-600",
                      "transition-colors"
                    )}
                    maxLength={1}
                  />
                ) : (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleLetterClick(i)}
                    className={cn(
                      "w-10 h-10 flex items-center justify-center rounded-md font-mono text-lg font-bold uppercase",
                      "transition-all cursor-pointer",
                      isUnchanged
                        ? "bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:border-blue-400 dark:hover:border-blue-500"
                        : "bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-400 dark:border-purple-500 text-purple-700 dark:text-purple-300"
                    )}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
            <span className="text-xs text-gray-400 w-12 shrink-0">
              {activeIndex !== null ? "TAP" : ""}
            </span>
          </div>
        )}

        {/* Target word (always shown at bottom when not yet reached) */}
        {!chain.includes(currentPuzzle.target) && (
          <>
            {/* Dots representing remaining distance */}
            <div className="flex gap-1 py-1">
              {Array.from({ length: Math.min(5, getDistance(lastWord, currentPuzzle.target, graph) - 1) }).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
              ))}
            </div>
            <div className="flex items-center gap-2 w-full justify-center opacity-60">
              <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
              <div className="flex gap-1">
                {currentPuzzle.target.split("").map((letter, j) => (
                  <div
                    key={j}
                    className="w-10 h-10 flex items-center justify-center rounded-md font-mono text-lg font-bold uppercase bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-2 border-amber-300 dark:border-amber-700 border-dashed"
                  >
                    {letter}
                  </div>
                ))}
              </div>
              <span className="text-xs text-amber-500 w-12 shrink-0">TARGET</span>
            </div>
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400 font-medium animate-in fade-in">
          {error}
        </p>
      )}

      {/* Win/Give-up message */}
      {isWon && (
        <div className="text-center space-y-1">
          <p className={cn("text-xl font-bold", getScoreLabelColor(stepsOverPar))}>
            {getScoreLabel(stepsOverPar)}!
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {steps} step{steps !== 1 ? "s" : ""} (Par {currentPuzzle.par})
            {hintsUsed > 0 && ` · ${hintsUsed} hint${hintsUsed !== 1 ? "s" : ""}`}
          </p>
        </div>
      )}

      {isGaveUp && (
        <div className="text-center space-y-1">
          <p className="text-lg font-bold text-gray-500">Game Over</p>
          <p className="text-sm text-gray-400">Better luck tomorrow!</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 w-full">
        {gameStatus === "playing" ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleHint}
              className="flex-1"
            >
              <Lightbulb className="mr-1.5 h-4 w-4" />
              Hint{hintsUsed > 0 && ` (${hintsUsed})`}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={chain.length <= 1}
              className="flex-1"
            >
              <Undo2 className="mr-1.5 h-4 w-4" />
              Undo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={giveUp}
              className="flex-1 text-gray-400 hover:text-red-500"
            >
              <Flag className="mr-1.5 h-4 w-4" />
              Give Up
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={resetGame}
              className="flex-1"
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Play Again
            </Button>
            {onShuffle && gameStatus === "won" && (
              <Button
                variant="default"
                size="sm"
                onClick={onShuffle}
                className="flex-1"
              >
                <Shuffle className="mr-1.5 h-4 w-4" />
                New Puzzle
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
