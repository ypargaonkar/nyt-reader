import { NextRequest, NextResponse } from "next/server";
import {
  recordInteraction,
  getCachedArticle,
  updateProfileScore,
  getUnanalyzedLikedCount,
  isArticleSaved,
  unsaveArticle,
} from "@/lib/db";
import type { InteractionType, Article } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { articleUri, action } = (await request.json()) as {
      articleUri: string;
      action: InteractionType;
    };

    if (!articleUri || !action) {
      return NextResponse.json(
        { error: "articleUri and action are required" },
        { status: 400 }
      );
    }

    if (!["read", "liked", "dismissed", "saved"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be read, liked, dismissed, or saved" },
        { status: 400 }
      );
    }

    // Handle saved action with toggle behavior
    if (action === "saved") {
      const alreadySaved = isArticleSaved(articleUri);
      if (alreadySaved) {
        unsaveArticle(articleUri);
        return NextResponse.json({
          success: true,
          action: "unsaved",
          articleUri,
        });
      }
    }

    // Record the interaction
    recordInteraction(articleUri, action);

    // If liked, update profile scores
    if (action === "liked") {
      const article = getCachedArticle(articleUri);
      if (article) {
        updateProfileFromArticle(article);
      }
    }

    // Check if we should trigger AI analysis
    const unanalyzedCount = getUnanalyzedLikedCount();
    const shouldAnalyze = unanalyzedCount >= 10;

    return NextResponse.json({
      success: true,
      action,
      articleUri,
      shouldTriggerAnalysis: shouldAnalyze,
      unanalyzedLikes: unanalyzedCount,
    });
  } catch (error) {
    console.error("Error recording interaction:", error);
    return NextResponse.json(
      { error: "Failed to record interaction" },
      { status: 500 }
    );
  }
}

function updateProfileFromArticle(article: Article) {
  // Update section score
  if (article.section) {
    updateProfileScore("section", article.section, 1);
  }

  // Update topic scores
  article.keywords.forEach((keyword) => {
    updateProfileScore("topic", keyword, 1);
  });

  // Update reporter scores
  if (article.byline) {
    // Extract reporter name from byline (e.g., "By John Smith")
    const bylineMatch = article.byline.match(/^By\s+(.+)/i);
    if (bylineMatch) {
      const reporters = bylineMatch[1].split(/\s+and\s+|,\s*/i);
      reporters.forEach((reporter) => {
        const cleanName = reporter.trim();
        if (cleanName && cleanName.length > 2) {
          updateProfileScore("reporter", cleanName, 1);
        }
      });
    }
  }

  // Update organization scores
  article.organizations.forEach((org) => {
    updateProfileScore("organization", org, 1);
  });

  // Update location scores
  article.locations.forEach((loc) => {
    updateProfileScore("location", loc, 1);
  });

  // Update material type score
  if (article.materialType) {
    updateProfileScore("materialType", article.materialType, 1);
  }

  // Update multimedia preference
  if (article.hasMultimedia) {
    updateProfileScore("prefersMultimedia", "true", 0.1);
  }

  // Update interactive preference
  if (article.isInteractive) {
    updateProfileScore("prefersInteractive", "true", 0.1);
  }
}
