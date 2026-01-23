import { NextResponse } from "next/server";
import { getSavedArticles, getSavedArticleUris } from "@/lib/db";
import {
  getSavedArticlesCloud,
  getSavedArticleUrisCloud,
} from "@/lib/db-cloud";
import { isTursoConfigured } from "@/lib/turso";

export async function GET() {
  const useCloud = isTursoConfigured();

  try {
    const savedUris = useCloud
      ? await getSavedArticleUrisCloud()
      : getSavedArticleUris();
    const articles = useCloud
      ? await getSavedArticlesCloud(100)
      : getSavedArticles(100);

    return NextResponse.json({
      savedUris: Array.from(savedUris),
      articles,
      count: articles.length,
    });
  } catch (error) {
    console.error("Error fetching saved articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved articles" },
      { status: 500 }
    );
  }
}
