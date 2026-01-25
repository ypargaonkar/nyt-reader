import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Open article link - always opens in new tab
export function openArticleLink(url: string): void {
  window.open(url, "_blank");
}
