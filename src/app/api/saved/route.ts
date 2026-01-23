import { NextResponse } from "next/server";
import { getSavedArticles, getSavedArticleUris } from "@/lib/db";

export async function GET() {
  try {
    const savedUris = getSavedArticleUris();
    const articles = getSavedArticles(100);

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
