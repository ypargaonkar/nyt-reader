"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Bookmark,
  Layers,
  Compass,
} from "lucide-react";
import type { FeedSection, MainTab } from "@/lib/types";

interface SectionTabsProps {
  currentSection: FeedSection;
  onSectionChange: (section: FeedSection) => void;
}

const mainTabs: { id: MainTab; label: string; icon: React.ReactNode }[] = [
  { id: "stories", label: "Stories", icon: <Layers className="h-4 w-4" /> },
  { id: "for-you", label: "For You", icon: <Sparkles className="h-4 w-4" /> },
  { id: "discover", label: "Discover", icon: <Compass className="h-4 w-4" /> },
  { id: "saved", label: "Saved", icon: <Bookmark className="h-4 w-4" /> },
];

export function SectionTabs({
  currentSection,
  onSectionChange,
}: SectionTabsProps) {
  // Determine if current section is a main tab or a category
  const activeTab = mainTabs.find(t => t.id === currentSection)?.id || "for-you";

  return (
    <div className="border-b bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4">
        <Tabs
          value={activeTab}
          onValueChange={(value) => onSectionChange(value as FeedSection)}
        >
          <TabsList className="h-12 bg-transparent border-0 p-0 gap-1 w-full justify-start">
            {mainTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-1.5 px-4 py-2 min-h-[44px] data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800 rounded-lg font-medium touch-manipulation"
              >
                {tab.icon}
                <span className="text-sm">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
