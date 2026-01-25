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

// Convert NYT web URL to app deep link
function getNYTAppUrl(webUrl: string): string {
  // NYT app uses nytimes:// scheme
  // Convert https://www.nytimes.com/2024/... to nytimes://www.nytimes.com/2024/...
  return webUrl.replace(/^https?:\/\//, "nytimes://");
}

// Open article link - try NYT app on mobile, new tab on desktop
export function openArticleLink(url: string): void {
  if (isMobile()) {
    const appUrl = getNYTAppUrl(url);

    // Try to open in NYT app, fall back to browser after timeout
    const start = Date.now();
    const timeout = setTimeout(() => {
      // If we're still here after 1.5s, app didn't open - use browser
      if (Date.now() - start >= 1400) {
        window.location.href = url;
      }
    }, 1500);

    // Attempt to open NYT app
    window.location.href = appUrl;

    // If app opens, clear the fallback
    window.addEventListener("pagehide", () => clearTimeout(timeout), { once: true });
    window.addEventListener("blur", () => clearTimeout(timeout), { once: true });
  } else {
    window.open(url, "_blank");
  }
}
