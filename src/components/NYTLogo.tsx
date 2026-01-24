"use client";

import { cn } from "@/lib/utils";

interface NYTLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function NYTLogo({ className, size = "md" }: NYTLogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn(sizeClasses[size], className)}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* NYT Gothic "T" Logo */}
      <path
        d="M50 5C25.2 5 5 25.2 5 50s20.2 45 45 45 45-20.2 45-45S74.8 5 50 5zm0 6c21.5 0 39 17.5 39 39s-17.5 39-39 39-39-17.5-39-39 17.5-39 39-39z"
        fillOpacity="0.1"
      />
      {/* Stylized T */}
      <text
        x="50"
        y="68"
        textAnchor="middle"
        fontSize="55"
        fontFamily="'Times New Roman', Georgia, serif"
        fontWeight="bold"
        fontStyle="italic"
      >
        T
      </text>
    </svg>
  );
}

// Full "The New York Times" text logo for larger spaces
export function NYTTextLogo({ className }: { className?: string }) {
  return (
    <div className={cn("font-serif italic font-bold tracking-tight", className)}>
      <span className="text-[0.6em] font-normal not-italic">The</span>{" "}
      <span>New York Times</span>
    </div>
  );
}
