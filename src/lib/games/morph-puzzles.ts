// Morph Puzzles — daily puzzle selection logic

export interface MorphPuzzle {
  date: string;
  start: string;
  target: string;
  par: number;
  theme?: string;
}

let cachedPuzzles: MorphPuzzle[] | null = null;

/**
 * Load curated puzzles from the JSON file.
 */
async function loadPuzzles(): Promise<MorphPuzzle[]> {
  if (cachedPuzzles) return cachedPuzzles;

  const res = await fetch("/data/morph-puzzles.json");
  if (!res.ok) throw new Error("Failed to load puzzles");

  cachedPuzzles = await res.json();
  return cachedPuzzles!;
}

/**
 * Get today's date string in YYYY-MM-DD format.
 */
export function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * Get the puzzle number (days since launch).
 */
export function getPuzzleNumber(dateStr: string): number {
  const launch = new Date("2026-02-26");
  const current = new Date(dateStr);
  const diff = current.getTime() - launch.getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
}

/**
 * Get today's puzzle. Looks up by date, falls back to deterministic selection.
 */
export async function getTodaysPuzzle(): Promise<MorphPuzzle> {
  const puzzles = await loadPuzzles();
  const today = getTodayString();

  // Try exact date match
  const exact = puzzles.find((p) => p.date === today);
  if (exact) return exact;

  // Fallback: deterministic selection based on date
  const dayIndex = getPuzzleNumber(today) - 1;
  const index = dayIndex % puzzles.length;
  return { ...puzzles[index], date: today };
}
