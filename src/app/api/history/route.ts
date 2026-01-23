import { NextRequest, NextResponse } from "next/server";
import { getInteractions, getCachedArticle } from "@/lib/db";
import {
  getInteractionsCloud,
  getCachedArticleCloud,
} from "@/lib/db-cloud";
import { isTursoConfigured } from "@/lib/turso";
import type { Article, InteractionType } from "@/lib/types";

export async function GET(request: NextRequest) {
  const useCloud = isTursoConfigured();
  const searchParams = request.nextUrl.searchParams;
  const type = (searchParams.get("type") || "liked") as InteractionType;
  const limit = parseInt(searchParams.get("limit") || "50");

  try {
    // Get interactions
    const interactions = useCloud
      ? await getInteractionsCloud(type)
      : getInteractions(type);
    const limitedInteractions = interactions.slice(0, limit);

    // Fetch article details for each interaction
    const articles: Article[] = [];
    for (const interaction of limitedInteractions) {
      const article = useCloud
        ? await getCachedArticleCloud(interaction.articleUri)
        : getCachedArticle(interaction.articleUri);
      if (article) {
        articles.push(article);
      }
    }

    return NextResponse.json({
      articles,
      total: interactions.length,
      type,
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
