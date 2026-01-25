import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Detect if user is on mobile device
export function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
}

// Open article link - same tab on mobile, new tab on desktop
export function openArticleLink(url: string): void {
  if (isMobile()) {
    window.location.href = url;
  } else {
    window.open(url, "_blank");
  }
}
