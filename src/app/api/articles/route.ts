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
import type { FeedSection } from "@/lib/types";

// Cache duration in milliseconds (15 minutes)
const CACHE_DURATION_MS = 15 * 60 * 1000;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const section = (searchParams.get("section") || "home") as FeedSection;
  const forceRefresh = searchParams.get("refresh") === "true";
  const apiKey = request.headers.get("x-nyt-api-key");

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
    const lastCallTime = getLastApiCallTime();
    const cacheAge = lastCallTime ? Date.now() - lastCallTime : Infinity;
    const cacheValid = cacheAge < CACHE_DURATION_MS;

    if (!forceRefresh && cacheValid) {
      // Use cached articles - NO API CALL
      allArticles = getCachedArticles(600); // Get up to 600 cached articles
      fromCache = true;
    } else {
      // Check daily limit before making API calls
      const todayCalls = getTodayApiCallCount();
      if (todayCalls >= 490) {
        // Try to use stale cache if available
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
        // Fetch fresh articles from NYT API (2 API calls)
        allArticles = await fetchComprehensiveFeed(apiKey);

        // Record the API calls
        recordApiCall("timeswire");
        recordApiCall("topstories");

        // Cache all articles in the database
        cacheArticles(allArticles);
      }
    }

    // Filter by requested section (local filtering, no API call)
    const sectionArticles = filterArticlesBySection(allArticles, section);

    // Filter out read articles
    const readUris = getReadArticleUris();
    const unreadArticles = sectionArticles.filter((a) => !readUris.has(a.uri));

    return NextResponse.json({
      articles: unreadArticles,
      allArticles: allArticles.length,
      sectionArticles: sectionArticles.length,
      unread: unreadArticles.length,
      apiCallsToday: getTodayApiCallCount(),
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
