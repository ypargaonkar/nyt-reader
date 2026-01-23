import { NextRequest, NextResponse } from "next/server";
import {
  recordInteraction,
  getCachedArticle,
  updateProfileScore,
  getUnanalyzedLikedCount,
  isArticleSaved,
  unsaveArticle,
} from "@/lib/db";
import {
  recordInteractionCloud,
  getCachedArticleCloud,
  updateProfileScoreCloud,
  getUnanalyzedLikedCountCloud,
  isArticleSavedCloud,
  unsaveArticleCloud,
} from "@/lib/db-cloud";
import { isTursoConfigured } from "@/lib/turso";
import type { InteractionType, Article } from "@/lib/types";

export async function POST(request: NextRequest) {
  const useCloud = isTursoConfigured();

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
      const alreadySaved = useCloud
        ? await isArticleSavedCloud(articleUri)
        : isArticleSaved(articleUri);
      if (alreadySaved) {
        if (useCloud) {
          await unsaveArticleCloud(articleUri);
        } else {
          unsaveArticle(articleUri);
        }
        return NextResponse.json({
          success: true,
          action: "unsaved",
          articleUri,
        });
      }
    }

    // Record the interaction
    if (useCloud) {
      await recordInteractionCloud(articleUri, action);
    } else {
      recordInteraction(articleUri, action);
    }

    // If liked, update profile scores
    if (action === "liked") {
      const article = useCloud
        ? await getCachedArticleCloud(articleUri)
        : getCachedArticle(articleUri);
      if (article) {
        await updateProfileFromArticle(article, useCloud);
      }
    }

    // Check if we should trigger AI analysis
    const unanalyzedCount = useCloud
      ? await getUnanalyzedLikedCountCloud()
      : getUnanalyzedLikedCount();
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

async function updateProfileFromArticle(article: Article, useCloud: boolean) {
  const updateScore = useCloud
    ? (cat: string, val: string, score: number) =>
        updateProfileScoreCloud(cat, val, score)
    : (cat: string, val: string, score: number) => {
        updateProfileScore(cat, val, score);
        return Promise.resolve();
      };

  // Update section score
  if (article.section) {
    await updateScore("section", article.section, 1);
  }

  // Update topic scores
  for (const keyword of article.keywords) {
    await updateScore("topic", keyword, 1);
  }

  // Update reporter scores
  if (article.byline) {
    // Extract reporter name from byline (e.g., "By John Smith")
    const bylineMatch = article.byline.match(/^By\s+(.+)/i);
    if (bylineMatch) {
      const reporters = bylineMatch[1].split(/\s+and\s+|,\s*/i);
      for (const reporter of reporters) {
        const cleanName = reporter.trim();
        if (cleanName && cleanName.length > 2) {
          await updateScore("reporter", cleanName, 1);
        }
      }
    }
  }

  // Update organization scores
  for (const org of article.organizations) {
    await updateScore("organization", org, 1);
  }

  // Update location scores
  for (const loc of article.locations) {
    await updateScore("location", loc, 1);
  }

  // Update material type score
  if (article.materialType) {
    await updateScore("materialType", article.materialType, 1);
  }

  // Update multimedia preference
  if (article.hasMultimedia) {
    await updateScore("prefersMultimedia", "true", 0.1);
  }

  // Update interactive preference
  if (article.isInteractive) {
    await updateScore("prefersInteractive", "true", 0.1);
  }
}
