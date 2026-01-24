"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  Vote,
  Globe,
  Flag,
  MessageSquare,
  FlaskConical,
  Cpu,
  Leaf,
  BarChart3,
  Search,
  Building2,
  Palette,
  BookOpen,
  Newspaper,
  User,
  Settings,
  History,
  Trophy,
  Heart,
  UtensilsCrossed,
  Plane,
  Home,
  Shirt,
  Film,
  Theater,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FeedSection, CategorySection } from "@/lib/types";

interface HamburgerMenuProps {
  currentSection: FeedSection;
  onSectionChange: (section: FeedSection) => void;
  onSettingsClick: () => void;
}

const categoryItems: { id: CategorySection; label: string; icon: React.ReactNode }[] = [
  // News
  { id: "politics", label: "Politics", icon: <Vote className="h-5 w-5" /> },
  { id: "world", label: "World", icon: <Globe className="h-5 w-5" /> },
  { id: "us", label: "U.S.", icon: <Flag className="h-5 w-5" /> },
  { id: "nyregion", label: "NY Region", icon: <MapPin className="h-5 w-5" /> },
  { id: "business", label: "Business", icon: <Building2 className="h-5 w-5" /> },
  { id: "technology", label: "Tech", icon: <Cpu className="h-5 w-5" /> },
  { id: "science", label: "Science", icon: <FlaskConical className="h-5 w-5" /> },
  { id: "climate", label: "Climate", icon: <Leaf className="h-5 w-5" /> },
  { id: "health", label: "Health", icon: <Heart className="h-5 w-5" /> },
  { id: "sports", label: "Sports", icon: <Trophy className="h-5 w-5" /> },
  // Opinion & Analysis
  { id: "opinion", label: "Opinion", icon: <MessageSquare className="h-5 w-5" /> },
  { id: "investigative", label: "Investigative", icon: <Search className="h-5 w-5" /> },
  { id: "graphics", label: "Graphics", icon: <BarChart3 className="h-5 w-5" /> },
  // Culture & Lifestyle
  { id: "arts", label: "Arts", icon: <Palette className="h-5 w-5" /> },
  { id: "movies", label: "Movies", icon: <Film className="h-5 w-5" /> },
  { id: "theater", label: "Theater", icon: <Theater className="h-5 w-5" /> },
  { id: "books", label: "Books", icon: <BookOpen className="h-5 w-5" /> },
  { id: "food", label: "Food", icon: <UtensilsCrossed className="h-5 w-5" /> },
  { id: "travel", label: "Travel", icon: <Plane className="h-5 w-5" /> },
  { id: "fashion", label: "Fashion", icon: <Shirt className="h-5 w-5" /> },
  { id: "realestate", label: "Real Estate", icon: <Home className="h-5 w-5" /> },
  { id: "magazine", label: "Magazine", icon: <Newspaper className="h-5 w-5" /> },
];

export function HamburgerMenu({
  currentSection,
  onSectionChange,
  onSettingsClick,
}: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSectionClick = (section: CategorySection) => {
    onSectionChange(section);
    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="h-11 w-11 touch-manipulation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[60]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-950 z-[70] transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <span className="font-serif text-xl font-bold">
            <span className="text-gray-900 dark:text-white">NYT</span>
            <span className="text-blue-600"> Reader</span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-9 w-9"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Sections - scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <p className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Browse Sections
            </p>
            {categoryItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSectionClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  currentSection === item.id
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-white dark:bg-gray-950 p-2 shrink-0">
          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <User className="h-5 w-5" />
            <span className="font-medium">My Profile</span>
          </Link>
          <Link
            href="/history"
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <History className="h-5 w-5" />
            <span className="font-medium">Reading History</span>
          </Link>
          <button
            onClick={() => {
              setIsOpen(false);
              onSettingsClick();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">Settings</span>
          </button>
        </div>
      </div>
    </>
  );
}
