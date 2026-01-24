"use client";

import { cn } from "@/lib/utils";

interface NYTLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "light" | "dark";
}

// NYT official logo URLs
const LOGO_URLS = {
  dark: "https://static01.nyt.com/newsgraphics/2015/12/23/daily-briefing/7a85af6ca4be8a012f2b3ab0f3bde2e9dd6ae05e/nyt-logo.png",
  light: "https://static01.nyt.com/images/misc/NYT_logo_rss_250x40.png",
};

export function NYTLogo({ className, size = "md", variant = "dark" }: NYTLogoProps) {
  const sizeClasses = {
    sm: "h-6",
    md: "h-8",
    lg: "h-12",
    xl: "h-16",
  };

  return (
    <img
      src={LOGO_URLS[variant]}
      alt="The New York Times"
      className={cn(
        sizeClasses[size],
        "w-auto object-contain",
        variant === "dark" && "invert dark:invert-0",
        variant === "light" && "dark:invert",
        className
      )}
    />
  );
}

// Compact stacked version for square spaces
export function NYTLogoStacked({ className, size = "md" }: Omit<NYTLogoProps, "variant">) {
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
  };

  return (
    <div
      className={cn(
        "font-serif font-bold leading-tight text-center",
        sizeClasses[size],
        className
      )}
    >
      <div className="text-[0.7em] font-normal tracking-wide">The</div>
      <div className="tracking-tight">New York</div>
      <div className="tracking-tight">Times</div>
    </div>
  );
}
