// Morph Game Engine — BFS graph construction, shortest path, validation, distance

export type WordGraph = Map<string, string[]>;

/**
 * Build an adjacency graph where words differing by exactly 1 letter are neighbors.
 * Uses a pattern index for efficiency: "cold" → ["_old", "c_ld", "co_d", "col_"]
 */
export function buildGraph(words: string[]): WordGraph {
  const patternMap = new Map<string, string[]>();

  for (const word of words) {
    for (let i = 0; i < word.length; i++) {
      const pattern = word.slice(0, i) + "_" + word.slice(i + 1);
      if (!patternMap.has(pattern)) {
        patternMap.set(pattern, []);
      }
      patternMap.get(pattern)!.push(word);
    }
  }

  const graph: WordGraph = new Map();
  for (const word of words) {
    graph.set(word, []);
  }

  for (const neighbors of patternMap.values()) {
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        graph.get(neighbors[i])!.push(neighbors[j]);
        graph.get(neighbors[j])!.push(neighbors[i]);
      }
    }
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
 * Check if a move is valid: exactly 1 letter differs and the word is in the dictionary.
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

  let diffCount = 0;
  for (let i = 0; i < prev.length; i++) {
    if (prev[i] !== next[i]) diffCount++;
  }

  if (diffCount === 0) {
    return { valid: false, reason: "Must change at least one letter" };
  }

  if (diffCount > 1) {
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
