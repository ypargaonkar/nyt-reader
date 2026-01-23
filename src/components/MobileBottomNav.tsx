"use client";

import {
  Home,
  Sparkles,
  Bookmark,
  Layers,
  User,
} from "lucide-react";
import type { FeedSection } from "@/lib/types";

interface MobileBottomNavProps {
  currentSection: FeedSection;
  onSectionChange: (section: FeedSection) => void;
  onProfileClick: () => void;
}

const navItems: { id: FeedSection | "profile"; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "Home", icon: <Home className="h-5 w-5" /> },
  { id: "for-you", label: "For You", icon: <Sparkles className="h-5 w-5" /> },
  { id: "saved", label: "Saved", icon: <Bookmark className="h-5 w-5" /> },
  { id: "stories", label: "Stories", icon: <Layers className="h-5 w-5" /> },
  { id: "profile", label: "Profile", icon: <User className="h-5 w-5" /> },
];

export function MobileBottomNav({
  currentSection,
  onSectionChange,
  onProfileClick,
}: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = item.id !== "profile" && currentSection === item.id;
          const handleClick = () => {
            if (item.id === "profile") {
              onProfileClick();
            } else {
              onSectionChange(item.id as FeedSection);
            }
          };

          return (
            <button
              key={item.id}
              onClick={handleClick}
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
