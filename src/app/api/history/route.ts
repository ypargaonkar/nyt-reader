import { NextRequest, NextResponse } from "next/server";
import { getInteractions, getCachedArticle } from "@/lib/db";
import type { Article, InteractionType } from "@/lib/types";

// Database returns snake_case, so we need this interface
interface DbInteraction {
  id: number;
  article_uri: string;
  action: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = (searchParams.get("type") || "liked") as InteractionType;
  const limit = parseInt(searchParams.get("limit") || "50");

  try {
    // Get interactions (returns snake_case from SQLite)
    const interactions = getInteractions(type).slice(0, limit) as unknown as DbInteraction[];

    // Fetch article details for each interaction
    const articles: Article[] = [];
    for (const interaction of interactions) {
      const article = getCachedArticle(interaction.article_uri);
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
