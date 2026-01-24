import { NextRequest, NextResponse } from "next/server";
import {
  fetchComprehensiveFeed,
  filterArticlesBySection,
} from "@/lib/nyt-client";
import {
  cacheArticles,
  getCachedArticles,
  getReadArticleUris,
  recordApiCall,
  getTodayApiCallCount,
  getLastApiCallTime,
} from "@/lib/db";
import { isTursoConfigured } from "@/lib/turso";
import {
  cacheArticlesCloud,
  getCachedArticlesCloud,
  getReadArticleUrisCloud,
} from "@/lib/db-cloud";
import type { FeedSection } from "@/lib/types";

// Cache duration in milliseconds (15 minutes)
const CACHE_DURATION_MS = 15 * 60 * 1000;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const section = (searchParams.get("section") || "for-you") as FeedSection;
  const forceRefresh = searchParams.get("refresh") === "true";
  const apiKey = request.headers.get("x-nyt-api-key");
  const useCloud = isTursoConfigured();

  if (!apiKey) {
    return NextResponse.json(
      { error: "NYT API key required" },
      { status: 401 }
    );
  }

  try {
    let allArticles;
    let fromCache = false;

    // Check if we have valid cached articles (unless force refresh)
    const lastCallTime = useCloud ? null : getLastApiCallTime();
    const cacheAge = lastCallTime ? Date.now() - lastCallTime : Infinity;
    const cacheValid = !useCloud && cacheAge < CACHE_DURATION_MS;

    if (!forceRefresh && cacheValid) {
      // Use cached articles - NO API CALL
      allArticles = getCachedArticles(600);
      fromCache = true;
    } else if (!forceRefresh && useCloud) {
      // Try cloud cache first
      allArticles = await getCachedArticlesCloud(600);
      if (allArticles.length > 0) {
        fromCache = true;
      }
    }

    if (!allArticles || allArticles.length === 0) {
      // Check daily limit before making API calls (local only)
      const todayCalls = useCloud ? 0 : getTodayApiCallCount();
      if (!useCloud && todayCalls >= 490) {
        allArticles = getCachedArticles(600);
        if (allArticles.length > 0) {
          fromCache = true;
        } else {
          return NextResponse.json(
            { error: "Daily API limit nearly reached. Please try again tomorrow." },
            { status: 429 }
          );
        }
      } else {
        // Fetch fresh articles from NYT API
        allArticles = await fetchComprehensiveFeed(apiKey);

        // Record and cache
        if (useCloud) {
          await cacheArticlesCloud(allArticles);
        } else {
          recordApiCall("timeswire");
          recordApiCall("topstories");
          cacheArticles(allArticles);
        }
      }
    }

    // Filter by requested section
    const sectionArticles = filterArticlesBySection(allArticles, section);

    // Filter out read articles
    const readUris = useCloud ? await getReadArticleUrisCloud() : getReadArticleUris();
    const unreadArticles = sectionArticles.filter((a) => !readUris.has(a.uri));

    return NextResponse.json({
      articles: unreadArticles,
      allArticles: allArticles.length,
      sectionArticles: sectionArticles.length,
      unread: unreadArticles.length,
      apiCallsToday: useCloud ? 0 : getTodayApiCallCount(),
      section,
      fromCache,
      cacheAge: cacheValid ? Math.round(cacheAge / 1000) : null,
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch articles" },
      { status: 500 }
    );
  }
}
