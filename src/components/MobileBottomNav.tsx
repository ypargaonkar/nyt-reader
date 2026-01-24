"use client";

import {
  Sparkles,
  Bookmark,
  Layers,
  Compass,
} from "lucide-react";
import type { FeedSection, MainTab } from "@/lib/types";

interface MobileBottomNavProps {
  currentSection: FeedSection;
  onSectionChange: (section: FeedSection) => void;
}

const navItems: { id: MainTab; label: string; icon: React.ReactNode }[] = [
  { id: "stories", label: "Stories", icon: <Layers className="h-5 w-5" /> },
  { id: "for-you", label: "For You", icon: <Sparkles className="h-5 w-5" /> },
  { id: "discover", label: "Discover", icon: <Compass className="h-5 w-5" /> },
  { id: "saved", label: "Saved", icon: <Bookmark className="h-5 w-5" /> },
];

export function MobileBottomNav({
  currentSection,
  onSectionChange,
}: MobileBottomNavProps) {
  // Check if current section is one of the main tabs
  const isMainTab = navItems.some(item => item.id === currentSection);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = currentSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`flex flex-col items-center justify-center min-w-[64px] min-h-[48px] px-3 py-2 rounded-lg transition-colors touch-manipulation ${
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800"
              }`}
            >
              {item.icon}
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
