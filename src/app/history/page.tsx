"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Heart, BookOpen, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchFilter, applyFilters, type FilterOptions } from "@/components/SearchFilter";
import { useAppStore } from "@/lib/store";
import type { Article } from "@/lib/types";

interface HistoryData {
  likedArticles: Article[];
  readArticles: Article[];
}

export default function HistoryPage() {
  const { globalFilters, setGlobalFilters } = useAppStore();
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("liked");
  const [searchQuery, setSearchQuery] = useState("");

  // Combined filters (global + local search)
  const filters: FilterOptions = {
    searchQuery,
    sections: globalFilters.sections,
    readingTime: globalFilters.readingTime,
    dateRange: globalFilters.dateRange,
    quickFilter: globalFilters.quickFilter,
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters: FilterOptions) => {
    setSearchQuery(newFilters.searchQuery);
    setGlobalFilters({
      sections: newFilters.sections,
      readingTime: newFilters.readingTime,
      dateRange: newFilters.dateRange,
      quickFilter: newFilters.quickFilter,
    });
  };

  // Get current articles based on active tab
  const currentArticles = activeTab === "liked"
    ? (data?.likedArticles || [])
    : (data?.readArticles || []);

  // Get available sections from current tab's articles
  const availableSections = [...new Set(currentArticles.map((a) => a.section))].sort();

  // Apply filters
  const filteredLiked = data ? applyFilters(data.likedArticles, filters) : [];
  const filteredRead = data ? applyFilters(data.readArticles, filters) : [];

  const hasActiveFilters = filters.searchQuery || filters.sections.length > 0 ||
    filters.readingTime !== "any" || filters.dateRange !== "any" || filters.quickFilter;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Fetch liked and read articles in parallel
        const [likedRes, readRes] = await Promise.all([
          fetch("/api/history?type=liked&limit=100"),
          fetch("/api/history?type=read&limit=100"),
        ]);

        const likedData = likedRes.ok ? await likedRes.json() : { articles: [] };
        const readData = readRes.ok ? await readRes.json() : { articles: [] };

        setData({
          likedArticles: likedData.articles || [],
          readArticles: readData.articles || [],
        });
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 dark:bg-gray-950/95 backdrop-blur">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Reading History</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Search & Filter */}
        <div className="mb-6">
          <SearchFilter
            filters={filters}
            onFiltersChange={handleFiltersChange}
            availableSections={availableSections}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="liked" className="gap-2">
              <Heart className="h-4 w-4" />
              Liked {data && `(${filteredLiked.length})`}
            </TabsTrigger>
            <TabsTrigger value="read" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Read {data && `(${filteredRead.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="liked">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : filteredLiked.length > 0 ? (
              <div className="space-y-4">
                {filteredLiked.map((article) => (
                  <HistoryCard key={article.uri} article={article} />
                ))}
              </div>
            ) : hasActiveFilters ? (
              <EmptyState
                icon={<Search className="h-12 w-12 text-gray-300" />}
                title="No matches found"
                description="No liked articles match your filters"
              />
            ) : (
              <EmptyState
                icon={<Heart className="h-12 w-12 text-gray-300" />}
                title="No liked articles yet"
                description="Articles you like will appear here. Like articles to build your personalized reading profile."
              />
            )}
          </TabsContent>

          <TabsContent value="read">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : filteredRead.length > 0 ? (
              <div className="space-y-4">
                {filteredRead.map((article) => (
                  <HistoryCard key={article.uri} article={article} />
                ))}
              </div>
            ) : hasActiveFilters ? (
              <EmptyState
                icon={<Search className="h-12 w-12 text-gray-300" />}
                title="No matches found"
                description="No read articles match your filters"
              />
            ) : (
              <EmptyState
                icon={<BookOpen className="h-12 w-12 text-gray-300" />}
                title="No reading history"
                description="Articles you mark as read or dismiss will appear here."
              />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function HistoryCard({ article }: { article: Article }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {article.imageUrl && (
            <img
              src={article.imageUrl}
              alt=""
              className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {article.section}
              </Badge>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(article.publishedDate), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <h3 className="font-semibold text-lg leading-tight mb-1 line-clamp-2">
              {article.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
              {article.byline}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open(article.url, "_blank")}
            className="flex-shrink-0"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon}
      <h2 className="text-xl font-semibold mt-4 mb-2">{title}</h2>
      <p className="text-gray-500 max-w-md">{description}</p>
      <Link href="/" className="mt-6">
        <Button>Browse Articles</Button>
      </Link>
    </div>
  );
}
