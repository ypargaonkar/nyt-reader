"use client";

import { useState } from "react";
import {
  Search,
  X,
  Filter,
  Clock,
  Calendar,
  Zap,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface FilterOptions {
  searchQuery: string;
  sections: string[];
  readingTime: "any" | "quick" | "medium" | "long";
  dateRange: "any" | "6h" | "today" | "week" | "month";
  quickFilter?: "new" | "today" | null;
}

interface SearchFilterProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  availableSections: string[];
}

const readingTimeLabels = {
  any: "Any length",
  quick: "Quick read (<5 min)",
  medium: "Medium (5-15 min)",
  long: "Long read (15+ min)",
};

const dateRangeLabels = {
  any: "Any time",
  "6h": "Last 6 hours",
  today: "Today",
  week: "This week",
  month: "This month",
};

export function SearchFilter({
  filters,
  onFiltersChange,
  availableSections,
}: SearchFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters =
    filters.searchQuery ||
    filters.sections.length > 0 ||
    filters.readingTime !== "any" ||
    filters.dateRange !== "any" ||
    filters.quickFilter;

  const activeFilterCount =
    (filters.searchQuery ? 1 : 0) +
    filters.sections.length +
    (filters.readingTime !== "any" ? 1 : 0) +
    (filters.dateRange !== "any" ? 1 : 0) +
    (filters.quickFilter ? 1 : 0);

  const clearFilters = () => {
    onFiltersChange({
      searchQuery: "",
      sections: [],
      readingTime: "any",
      dateRange: "any",
      quickFilter: null,
    });
  };

  const toggleQuickFilter = (filter: "new" | "today") => {
    onFiltersChange({
      ...filters,
      quickFilter: filters.quickFilter === filter ? null : filter,
    });
  };

  const toggleSection = (section: string) => {
    const newSections = filters.sections.includes(section)
      ? filters.sections.filter((s) => s !== section)
      : [...filters.sections, section];
    onFiltersChange({ ...filters, sections: newSections });
  };

  return (
    <div className="space-y-3">
      {/* Search bar with quick filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search articles..."
            value={filters.searchQuery}
            onChange={(e) =>
              onFiltersChange({ ...filters, searchQuery: e.target.value })
            }
            className="w-full pl-10 pr-10 py-2 border rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onFiltersChange({ ...filters, searchQuery: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick filter buttons - NEW and TODAY */}
        <Button
          variant={filters.quickFilter === "new" ? "default" : "outline"}
          size="sm"
          onClick={() => toggleQuickFilter("new")}
          className={cn(
            "gap-1.5 font-medium whitespace-nowrap",
            filters.quickFilter === "new"
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "hover:border-red-300 hover:text-red-600"
          )}
        >
          <Zap className="w-3.5 h-3.5" />
          NEW
        </Button>

        <Button
          variant={filters.quickFilter === "today" ? "default" : "outline"}
          size="sm"
          onClick={() => toggleQuickFilter("today")}
          className={cn(
            "gap-1.5 font-medium whitespace-nowrap",
            filters.quickFilter === "today"
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "hover:border-green-300 hover:text-green-600"
          )}
        >
          <Sun className="w-3.5 h-3.5" />
          TODAY
        </Button>

        {/* Filter button */}
        <Button
          variant={hasActiveFilters && !filters.quickFilter ? "default" : "outline"}
          size="icon"
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative"
        >
          <Filter className="w-4 h-4" />
          {activeFilterCount > 0 && !filters.quickFilter && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          {/* Reading time filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "gap-1.5",
                  filters.readingTime !== "any" && "border-blue-500 text-blue-600"
                )}
              >
                <Clock className="w-3.5 h-3.5" />
                {readingTimeLabels[filters.readingTime]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Reading Time</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(readingTimeLabels) as Array<keyof typeof readingTimeLabels>).map(
                (key) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={filters.readingTime === key}
                    onCheckedChange={() =>
                      onFiltersChange({ ...filters, readingTime: key })
                    }
                  >
                    {readingTimeLabels[key]}
                  </DropdownMenuCheckboxItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Date range filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "gap-1.5",
                  filters.dateRange !== "any" && "border-blue-500 text-blue-600"
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                {dateRangeLabels[filters.dateRange]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Date Range</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(dateRangeLabels) as Array<keyof typeof dateRangeLabels>).map(
                (key) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={filters.dateRange === key}
                    onCheckedChange={() =>
                      onFiltersChange({ ...filters, dateRange: key })
                    }
                  >
                    {dateRangeLabels[key]}
                  </DropdownMenuCheckboxItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Section filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "gap-1.5",
                  filters.sections.length > 0 && "border-blue-500 text-blue-600"
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                {filters.sections.length > 0
                  ? `${filters.sections.length} sections`
                  : "All sections"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-64 overflow-y-auto">
              <DropdownMenuLabel>Sections</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableSections.map((section) => (
                <DropdownMenuCheckboxItem
                  key={section}
                  checked={filters.sections.includes(section)}
                  onCheckedChange={() => toggleSection(section)}
                >
                  {section}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-3.5 h-3.5 mr-1" />
              Clear all
            </Button>
          )}
        </div>
      )}

      {/* Active filter badges */}
      {hasActiveFilters && !isExpanded && (
        <div className="flex flex-wrap gap-1.5">
          {filters.searchQuery && (
            <Badge variant="secondary" className="gap-1">
              "{filters.searchQuery}"
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, searchQuery: "" })}
              />
            </Badge>
          )}
          {filters.sections.map((section) => (
            <Badge key={section} variant="secondary" className="gap-1">
              {section}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => toggleSection(section)}
              />
            </Badge>
          ))}
          {filters.readingTime !== "any" && (
            <Badge variant="secondary" className="gap-1">
              {readingTimeLabels[filters.readingTime]}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() =>
                  onFiltersChange({ ...filters, readingTime: "any" })
                }
              />
            </Badge>
          )}
          {filters.dateRange !== "any" && (
            <Badge variant="secondary" className="gap-1">
              {dateRangeLabels[filters.dateRange]}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, dateRange: "any" })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// Helper to check if article is "NEW" (< 1 hour old)
function isNewArticle(publishedDate: string): boolean {
  const now = new Date();
  const published = new Date(publishedDate);
  const minutesAgo = (now.getTime() - published.getTime()) / (1000 * 60);
  return minutesAgo < 60;
}

// Helper to check if article is from "TODAY"
function isTodayArticle(publishedDate: string): boolean {
  const now = new Date();
  const published = new Date(publishedDate);
  return (
    published.getDate() === now.getDate() &&
    published.getMonth() === now.getMonth() &&
    published.getFullYear() === now.getFullYear()
  );
}

// Filter function to apply filters to articles
export function applyFilters<T extends { title: string; abstract: string; section: string; keywords: string[]; publishedDate: string; wordCount: number }>(
  articles: T[],
  filters: FilterOptions
): T[] {
  return articles.filter((article) => {
    // Quick filter (NEW or TODAY buttons)
    if (filters.quickFilter === "new") {
      if (!isNewArticle(article.publishedDate)) return false;
    } else if (filters.quickFilter === "today") {
      if (!isTodayArticle(article.publishedDate)) return false;
    }

    // Search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase().trim();

      // Special tag searches
      if (query === "new") {
        if (!isNewArticle(article.publishedDate)) return false;
      } else if (query === "today") {
        if (!isTodayArticle(article.publishedDate)) return false;
      } else if (query === "new today" || query === "today new") {
        // Both NEW and TODAY - show only articles from today that are < 1 hour old
        if (!isNewArticle(article.publishedDate)) return false;
      } else {
        // Regular text search
        const matchesSearch =
          article.title.toLowerCase().includes(query) ||
          article.abstract.toLowerCase().includes(query) ||
          article.keywords.some((k) => k.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
    }

    // Sections
    if (filters.sections.length > 0) {
      if (!filters.sections.includes(article.section)) return false;
    }

    // Reading time
    const readTime = article.wordCount
      ? Math.ceil(article.wordCount / 200)
      : 5; // default estimate
    if (filters.readingTime === "quick" && readTime >= 5) return false;
    if (filters.readingTime === "medium" && (readTime < 5 || readTime > 15)) return false;
    if (filters.readingTime === "long" && readTime <= 15) return false;

    // Date range
    const publishedDate = new Date(article.publishedDate);
    const now = new Date();
    if (filters.dateRange === "6h") {
      const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      if (publishedDate < sixHoursAgo) return false;
    } else if (filters.dateRange === "today") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (publishedDate < today) return false;
    } else if (filters.dateRange === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (publishedDate < weekAgo) return false;
    } else if (filters.dateRange === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (publishedDate < monthAgo) return false;
    }

    return true;
  });
}
