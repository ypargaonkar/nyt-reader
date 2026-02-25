"use client";

import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface GameCardProps {
  name: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  href: string;
  isExternal?: boolean;
  badge?: string;
  onClick?: () => void;
}

export function GameCard({
  name,
  description,
  icon: Icon,
  iconColor,
  bgColor,
  href,
  isExternal = false,
  badge,
  onClick,
}: GameCardProps) {
  const content = (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border p-5",
        "bg-white dark:bg-gray-900",
        "hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600",
        "transition-all duration-200 cursor-pointer",
        "active:scale-[0.98]"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          bgColor
        )}
      >
        <Icon className={cn("h-6 w-6", iconColor)} />
      </div>

      {/* Text */}
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {name}
          </h3>
          {isExternal && (
            <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
          )}
          {badge && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {description}
        </p>
      </div>
    </div>
  );

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick}>
        {content}
      </a>
    );
  }

  return (
    <a href={href} onClick={onClick}>
      {content}
    </a>
  );
}
