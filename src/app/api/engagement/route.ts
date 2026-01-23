import { NextResponse } from "next/server";
import { getInteractions, getCachedArticle } from "@/lib/db";

export async function GET() {
  try {
    // Get all interactions by type
    const opened = getInteractions("opened");
    const liked = getInteractions("liked");
    const saved = getInteractions("saved");
    const read = getInteractions("read");

    // Create sets for quick lookup
    const likedUris = new Set(liked.map((i) => i.articleUri));
    const savedUris = new Set(saved.map((i) => i.articleUri));
    const readUris = new Set(read.map((i) => i.articleUri));

    // Calculate engagement patterns
    const patterns: {
      strongPositive: string[]; // opened AND liked
      positive: string[]; // opened AND saved (but not liked)
      weakNegative: string[]; // opened but no further action
      openedCount: number;
      likedCount: number;
      conversionRate: number; // % of opened that got liked
    } = {
      strongPositive: [],
      positive: [],
      weakNegative: [],
      openedCount: opened.length,
      likedCount: liked.length,
      conversionRate: 0,
    };

    // Analyze each opened article
    const openedUris = new Set<string>();
    for (const interaction of opened) {
      const uri = interaction.articleUri;
      if (openedUris.has(uri)) continue; // Skip duplicates
      openedUris.add(uri);

      if (likedUris.has(uri)) {
        patterns.strongPositive.push(uri);
      } else if (savedUris.has(uri)) {
        patterns.positive.push(uri);
      } else {
        // Opened but no like/save - weak negative
        patterns.weakNegative.push(uri);
      }
    }

    // Calculate conversion rate
    if (openedUris.size > 0) {
      patterns.conversionRate = Math.round(
        (patterns.strongPositive.length / openedUris.size) * 100
      );
    }

    // Get article metadata for pattern analysis (keywords, sections, reporters)
    const patternAnalysis: {
      likedKeywords: Record<string, number>;
      likedSections: Record<string, number>;
      likedReporters: Record<string, number>;
      skippedKeywords: Record<string, number>;
      skippedSections: Record<string, number>;
    } = {
      likedKeywords: {},
      likedSections: {},
      likedReporters: {},
      skippedKeywords: {},
      skippedSections: {},
    };

    // Analyze strong positive articles (opened + liked)
    for (const uri of patterns.strongPositive) {
      const article = getCachedArticle(uri);
      if (article) {
        // Count keywords (already an array)
        for (const kw of article.keywords || []) {
          patternAnalysis.likedKeywords[kw] = (patternAnalysis.likedKeywords[kw] || 0) + 1;
        }
        // Count sections
        patternAnalysis.likedSections[article.section] =
          (patternAnalysis.likedSections[article.section] || 0) + 1;
        // Count reporters
        if (article.byline) {
          const reporter = article.byline.replace(/^By\s+/i, "").trim();
          if (reporter) {
            patternAnalysis.likedReporters[reporter] =
              (patternAnalysis.likedReporters[reporter] || 0) + 1;
          }
        }
      }
    }

    // Analyze weak negative articles (opened but not liked)
    for (const uri of patterns.weakNegative) {
      const article = getCachedArticle(uri);
      if (article) {
        // Count keywords that didn't convert
        for (const kw of article.keywords || []) {
          patternAnalysis.skippedKeywords[kw] = (patternAnalysis.skippedKeywords[kw] || 0) + 1;
        }
        // Count sections that didn't convert
        patternAnalysis.skippedSections[article.section] =
          (patternAnalysis.skippedSections[article.section] || 0) + 1;
      }
    }

    return NextResponse.json({
      patterns,
      analysis: patternAnalysis,
      stats: {
        totalOpened: openedUris.size,
        totalLiked: likedUris.size,
        totalSaved: savedUris.size,
        strongPositiveCount: patterns.strongPositive.length,
        positiveCount: patterns.positive.length,
        weakNegativeCount: patterns.weakNegative.length,
        conversionRate: patterns.conversionRate,
      },
    });
  } catch (error) {
    console.error("Failed to get engagement patterns:", error);
    return NextResponse.json(
      { error: "Failed to get engagement patterns" },
      { status: 500 }
    );
  }
}
