"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check } from "lucide-react";
import { useMorphStore } from "@/lib/games/morph-store";
import {
  getDistanceEmoji,
  getScoreLabel,
  getDistance,
  type WordGraph,
} from "@/lib/games/morph-engine";
import { getPuzzleNumber } from "@/lib/games/morph-puzzles";

interface MorphShareProps {
  graph: WordGraph;
}

export function MorphShare({ graph }: MorphShareProps) {
  const [copied, setCopied] = useState(false);
  const { currentPuzzle, chain, hintsUsed, startTime, endTime } =
    useMorphStore();

  if (!currentPuzzle) return null;

  const steps = chain.length - 1;
  const stepsOverPar = steps - currentPuzzle.par;
  const scoreLabel = getScoreLabel(stepsOverPar);
  const puzzleNumber = getPuzzleNumber(currentPuzzle.date);

  // Build emoji chain
  const emojis = chain
    .map((word) => {
      const dist = getDistance(word, currentPuzzle.target, graph);
      return getDistanceEmoji(dist);
    })
    .join("");

  // Time
  let timeStr = "";
  if (startTime && endTime) {
    const seconds = Math.floor((endTime - startTime) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  const scoreDisplay =
    stepsOverPar === 0
      ? "Par"
      : stepsOverPar > 0
      ? `+${stepsOverPar}`
      : `${stepsOverPar}`;

  const shareText = [
    `Morph #${puzzleNumber} ${getDistanceEmoji(6)}→${getDistanceEmoji(0)}`,
    `${currentPuzzle.start.toUpperCase()} → ${currentPuzzle.target.toUpperCase()}`,
    "",
    emojis,
    `Par ${currentPuzzle.par} | ${scoreLabel} (${scoreDisplay})`,
    `${hintsUsed} hint${hintsUsed !== 1 ? "s" : ""} | ${timeStr}`,
  ].join("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = shareText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3">
      {/* Preview */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center font-mono text-sm whitespace-pre-line">
        {shareText}
      </div>

      <Button onClick={handleCopy} className="w-full" variant="default">
        {copied ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            Copied!
          </>
        ) : (
          <>
            <Share2 className="mr-2 h-4 w-4" />
            Copy to Clipboard
          </>
        )}
      </Button>
    </div>
  );
}
