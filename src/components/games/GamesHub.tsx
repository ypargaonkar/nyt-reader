"use client";

import {
  Gamepad2,
  Grid3X3,
  Hexagon,
  Puzzle,
  Hash,
  Spline,
  ArrowLeftRight,
} from "lucide-react";
import { GameCard } from "./GameCard";

const nytGames = [
  {
    name: "Wordle",
    description: "Guess the 5-letter word in 6 tries",
    icon: Grid3X3,
    iconColor: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/30",
    href: "https://www.nytimes.com/games/wordle",
    isExternal: true,
  },
  {
    name: "Spelling Bee",
    description: "Make words using 7 letters",
    icon: Hexagon,
    iconColor: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/30",
    href: "https://www.nytimes.com/puzzles/spelling-bee",
    isExternal: true,
  },
  {
    name: "Connections",
    description: "Group 16 words into 4 categories",
    icon: Puzzle,
    iconColor: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-900/30",
    href: "https://www.nytimes.com/games/connections",
    isExternal: true,
  },
  {
    name: "Mini Crossword",
    description: "A quick 5x5 crossword puzzle",
    icon: Hash,
    iconColor: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/30",
    href: "https://www.nytimes.com/crosswords/game/mini",
    isExternal: true,
  },
  {
    name: "Strands",
    description: "Find themed words in a letter grid",
    icon: Spline,
    iconColor: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-50 dark:bg-cyan-900/30",
    href: "https://www.nytimes.com/games/strands",
    isExternal: true,
  },
];

export function GamesHub() {
  return (
    <div className="space-y-8">
      {/* In-App Games */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Play Here
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <GameCard
            name="Morph"
            description="Transform one word into another, one letter at a time"
            icon={ArrowLeftRight}
            iconColor="text-amber-600 dark:text-amber-400"
            bgColor="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30"
            href="/games/morph"
            badge="New"
          />
        </div>
      </section>

      {/* NYT Games */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          NYT Games
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {nytGames.map((game) => (
            <GameCard key={game.name} {...game} />
          ))}
        </div>
      </section>
    </div>
  );
}
