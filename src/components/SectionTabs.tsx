"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Home,
  Sparkles,
  Bookmark,
  Layers,
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
} from "lucide-react";
import type { FeedSection } from "@/lib/types";

interface SectionTabsProps {
  currentSection: FeedSection;
  onSectionChange: (section: FeedSection) => void;
}

const sections: { id: FeedSection; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "Home", icon: <Home className="h-4 w-4" /> },
  { id: "for-you", label: "For You", icon: <Sparkles className="h-4 w-4" /> },
  { id: "saved", label: "Saved", icon: <Bookmark className="h-4 w-4" /> },
  { id: "stories", label: "Stories", icon: <Layers className="h-4 w-4" /> },
  { id: "politics", label: "Politics", icon: <Vote className="h-4 w-4" /> },
  { id: "world", label: "World", icon: <Globe className="h-4 w-4" /> },
  { id: "us", label: "U.S.", icon: <Flag className="h-4 w-4" /> },
  { id: "opinion", label: "Opinion", icon: <MessageSquare className="h-4 w-4" /> },
  { id: "science", label: "Science", icon: <FlaskConical className="h-4 w-4" /> },
  { id: "technology", label: "Tech", icon: <Cpu className="h-4 w-4" /> },
  { id: "climate", label: "Climate", icon: <Leaf className="h-4 w-4" /> },
  { id: "graphics", label: "Graphics", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "investigative", label: "Investigative", icon: <Search className="h-4 w-4" /> },
  { id: "business", label: "Business", icon: <Building2 className="h-4 w-4" /> },
  { id: "arts", label: "Arts", icon: <Palette className="h-4 w-4" /> },
  { id: "books", label: "Books", icon: <BookOpen className="h-4 w-4" /> },
  { id: "magazine", label: "Magazine", icon: <Newspaper className="h-4 w-4" /> },
];

export function SectionTabs({
  currentSection,
  onSectionChange,
}: SectionTabsProps) {
  return (
    <div className="border-b bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4">
        <ScrollArea className="w-full whitespace-nowrap">
          <Tabs
            value={currentSection}
            onValueChange={(value) => onSectionChange(value as FeedSection)}
          >
            <TabsList className="h-12 md:h-12 bg-transparent border-0 p-0 gap-1">
              {sections.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="flex items-center gap-1.5 px-3 md:px-3 py-2 min-h-[44px] md:h-10 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800 rounded-lg font-medium touch-manipulation"
                >
                  {section.icon}
                  <span className="text-sm md:text-base">{section.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      </div>
    </div>
  );
}
