// Morph Game Engine — BFS graph construction, shortest path, validation, distance

export type WordGraph = Map<string, string[]>;

/**
 * Get the sorted letter signature of a word (for multiset comparison).
 */
function sortedLetters(word: string): string {
  return word.split("").sort().join("");
}

/**
 * Build an adjacency graph where words are neighbors if their letter
 * multisets differ by exactly one substitution (one letter removed, one
 * letter added). This allows free rearrangement of letter positions.
 *
 * Uses a signature index: for "calm" (sorted "aclm"), generate signatures
 * by removing each letter: "_clm", "a_lm", "ac_m", "acl_". Words sharing
 * a reduced signature are neighbors (they share all but one letter).
 */
export function buildGraph(words: string[]): WordGraph {
  const sigMap = new Map<string, string[]>();

  for (const word of words) {
    const sorted = sortedLetters(word);
    for (let i = 0; i < sorted.length; i++) {
      const sig = sorted.slice(0, i) + "_" + sorted.slice(i + 1);
      if (!sigMap.has(sig)) {
        sigMap.set(sig, []);
      }
      sigMap.get(sig)!.push(word);
    }
  }

  const graph: WordGraph = new Map();
  for (const word of words) {
    graph.set(word, []);
  }

  // Words sharing a reduced signature differ by exactly one letter (multiset).
  // But we must exclude pairs that are pure anagrams (same multiset, 0 changes).
  for (const group of sigMap.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        // Skip if same sorted letters (pure anagram, not a valid move)
        if (sortedLetters(a) === sortedLetters(b)) continue;
        graph.get(a)!.push(b);
        graph.get(b)!.push(a);
      }
    }
  }

  // Deduplicate neighbor lists
  for (const [word, neighbors] of graph) {
    graph.set(word, [...new Set(neighbors)]);
  }

  return graph;
}

/**
 * BFS to find the shortest path between two words.
 * Returns the full path including start and target, or null if unreachable.
 */
export function findShortestPath(
  start: string,
  target: string,
  graph: WordGraph
): string[] | null {
  if (start === target) return [start];
  if (!graph.has(start) || !graph.has(target)) return null;

  const visited = new Set<string>([start]);
  const queue: [string, string[]][] = [[start, [start]]];

  while (queue.length > 0) {
    const [current, path] = queue.shift()!;
    const neighbors = graph.get(current) || [];

    for (const neighbor of neighbors) {
      if (neighbor === target) {
        return [...path, neighbor];
      }
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([neighbor, [...path, neighbor]]);
      }
    }
  }

  return null;
}

/**
 * Get BFS distance from a word to the target.
 * Returns -1 if unreachable.
 */
export function getDistance(
  word: string,
  target: string,
  graph: WordGraph
): number {
  if (word === target) return 0;
  if (!graph.has(word) || !graph.has(target)) return -1;

  const visited = new Set<string>([word]);
  const queue: [string, number][] = [[word, 0]];

  while (queue.length > 0) {
    const [current, dist] = queue.shift()!;
    const neighbors = graph.get(current) || [];

    for (const neighbor of neighbors) {
      if (neighbor === target) return dist + 1;
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([neighbor, dist + 1]);
      }
    }
  }

  return -1;
}

/**
 * Count letter frequencies in a word.
 */
function letterCounts(word: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ch of word) {
    counts.set(ch, (counts.get(ch) || 0) + 1);
  }
  return counts;
}

/**
 * Check if a move is valid: the letter multisets differ by exactly one
 * substitution (one letter removed, one letter added). Letters may be
 * freely rearranged between positions.
 *
 * Examples:
 *   COLD → COLA  (D removed, A added — valid)
 *   COLA → CALM  (O removed, M added, positions rearranged — valid)
 *   COLD → CALM  (O→A and D→M — two changes — invalid)
 */
export function isValidMove(
  prev: string,
  next: string,
  dictionary: Set<string>
): { valid: boolean; reason?: string } {
  if (next.length !== prev.length) {
    return { valid: false, reason: "Word must be " + prev.length + " letters" };
  }

  if (!dictionary.has(next.toLowerCase())) {
    return { valid: false, reason: "Not in dictionary" };
  }

  const prevCounts = letterCounts(prev);
  const nextCounts = letterCounts(next);

  // Count letters added and removed between the two multisets
  let added = 0;
  let removed = 0;

  const allLetters = new Set([...prevCounts.keys(), ...nextCounts.keys()]);
  for (const ch of allLetters) {
    const pCount = prevCounts.get(ch) || 0;
    const nCount = nextCounts.get(ch) || 0;
    if (nCount > pCount) added += nCount - pCount;
    if (pCount > nCount) removed += pCount - nCount;
  }

  if (added === 0 && removed === 0) {
    // Pure anagram with no letter change — not allowed
    return { valid: false, reason: "Must change at least one letter" };
  }

  if (added !== 1 || removed !== 1) {
    return { valid: false, reason: "Change only one letter at a time" };
  }

  return { valid: true };
}

/**
 * Get the color class for a word based on its BFS distance to target.
 */
export function getDistanceColor(distance: number): string {
  if (distance <= 0) return "bg-amber-500"; // target reached (gold)
  if (distance === 1) return "bg-orange-500";
  if (distance === 2) return "bg-orange-400";
  if (distance === 3) return "bg-purple-500";
  if (distance === 4) return "bg-violet-500";
  if (distance === 5) return "bg-blue-400";
  return "bg-blue-500"; // far away (cold)
}

/**
 * Get the text color class for a distance.
 */
export function getDistanceTextColor(distance: number): string {
  if (distance <= 0) return "text-amber-500";
  if (distance === 1) return "text-orange-500";
  if (distance === 2) return "text-orange-400";
  if (distance === 3) return "text-purple-500";
  if (distance === 4) return "text-violet-500";
  if (distance === 5) return "text-blue-400";
  return "text-blue-500";
}

/**
 * Get the share emoji for a distance.
 */
export function getDistanceEmoji(distance: number): string {
  if (distance <= 0) return "🟠";
  if (distance === 1) return "🟧";
  if (distance === 2) return "🟧";
  if (distance === 3) return "🟪";
  if (distance === 4) return "🟪";
  if (distance === 5) return "🟦";
  return "🟦";
}

/**
 * Generate a random puzzle from the graph. Picks two random words with
 * a BFS distance between minPar and maxPar.
 */
export function generateRandomPuzzle(
  words: string[],
  graph: WordGraph,
  minPar: number = 3,
  maxPar: number = 7
): { start: string; target: string; par: number } | null {
  const maxAttempts = 200;
  for (let i = 0; i < maxAttempts; i++) {
    const startIdx = Math.floor(Math.random() * words.length);
    const targetIdx = Math.floor(Math.random() * words.length);
    if (startIdx === targetIdx) continue;

    const start = words[startIdx];
    const target = words[targetIdx];
    const path = findShortestPath(start, target, graph);

    if (path && path.length - 1 >= minPar && path.length - 1 <= maxPar) {
      return { start, target, par: path.length - 1 };
    }
  }
  return null;
}

/**
 * Get score label for golf-style scoring.
 */
export function getScoreLabel(stepsOverPar: number): string {
  if (stepsOverPar <= -3) return "Albatross";
  if (stepsOverPar === -2) return "Eagle";
  if (stepsOverPar === -1) return "Birdie";
  if (stepsOverPar === 0) return "Par";
  if (stepsOverPar === 1) return "Bogey";
  if (stepsOverPar === 2) return "Double Bogey";
  return "Triple Bogey+";
}

/**
 * Get the score label color.
 */
export function getScoreLabelColor(stepsOverPar: number): string {
  if (stepsOverPar <= -2) return "text-yellow-500";
  if (stepsOverPar === -1) return "text-green-500";
  if (stepsOverPar === 0) return "text-blue-500";
  return "text-red-500";
}
