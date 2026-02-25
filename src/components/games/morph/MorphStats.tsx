"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMorphStore } from "@/lib/games/morph-store";

interface MorphStatsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MorphStats({ open, onOpenChange }: MorphStatsProps) {
  const stats = useMorphStore((s) => s.stats);

  const winRate =
    stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

  // Build distribution bars
  const distribution = stats.scoreDistribution;
  const distributionEntries = Object.entries(distribution).sort(
    ([a], [b]) => Number(a) - Number(b)
  );
  const maxCount = Math.max(1, ...Object.values(distribution));

  const scoreLabels: Record<string, string> = {
    "-3": "Albatross",
    "-2": "Eagle",
    "-1": "Birdie",
    "0": "Par",
    "1": "Bogey",
    "2": "Double Bogey",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Statistics</DialogTitle>
        </DialogHeader>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-2xl font-bold">{stats.gamesPlayed}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Played
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold">{winRate}%</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Win %
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.currentStreak}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Streak
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.maxStreak}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Max
            </div>
          </div>
        </div>

        {/* Score distribution */}
        {distributionEntries.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Score Distribution
            </h3>
            <div className="space-y-1">
              {distributionEntries.map(([score, count]) => {
                const label =
                  scoreLabels[score] ||
                  (Number(score) > 0 ? `+${score}` : score);
                const width = Math.max(8, (count / maxCount) * 100);
                const isNegative = Number(score) < 0;
                const isZero = Number(score) === 0;

                return (
                  <div key={score} className="flex items-center gap-2 text-xs">
                    <span className="w-20 text-right text-gray-600 dark:text-gray-400 shrink-0">
                      {label}
                    </span>
                    <div
                      className={`h-5 rounded-sm flex items-center justify-end px-1.5 text-white font-medium ${
                        isNegative
                          ? "bg-green-500"
                          : isZero
                          ? "bg-blue-500"
                          : "bg-red-400"
                      }`}
                      style={{ width: `${width}%` }}
                    >
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {stats.gamesPlayed === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            Play your first game to see stats!
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
