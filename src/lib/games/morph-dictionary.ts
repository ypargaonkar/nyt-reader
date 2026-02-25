// Morph Dictionary — load and cache the word list

import { buildGraph, type WordGraph } from "./morph-engine";

let cachedWords: string[] | null = null;
let cachedDictionary: Set<string> | null = null;
let cachedGraph: WordGraph | null = null;

/**
 * Load the word list from the JSON file. Cached after first load.
 */
export async function loadWords(): Promise<string[]> {
  if (cachedWords) return cachedWords;

  const res = await fetch("/data/morph-words.json");
  if (!res.ok) throw new Error("Failed to load word list");

  const words: string[] = await res.json();
  cachedWords = words;
  return words;
}

/**
 * Get the dictionary as a Set for fast lookups.
 */
export async function getDictionary(): Promise<Set<string>> {
  if (cachedDictionary) return cachedDictionary;

  const words = await loadWords();
  cachedDictionary = new Set(words);
  return cachedDictionary;
}

/**
 * Get the word graph, built from the dictionary. Cached after first build.
 */
export async function getGraph(): Promise<WordGraph> {
  if (cachedGraph) return cachedGraph;

  const words = await loadWords();
  cachedGraph = buildGraph(words);
  return cachedGraph;
}

/**
 * Check if a word is in the dictionary.
 */
export async function isValidWord(word: string): Promise<boolean> {
  const dict = await getDictionary();
  return dict.has(word.toLowerCase());
}
