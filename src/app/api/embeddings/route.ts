import { NextRequest, NextResponse } from "next/server";
import {
  getArticlesWithoutEmbeddings,
  saveEmbedding,
  getAllEmbeddings,
  getCachedArticles,
} from "@/lib/db";
import { generateEmbeddings } from "@/lib/embeddings";

export async function POST(request: NextRequest) {
  try {
    const { openaiApiKey } = await request.json();

    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "OpenAI API key is required" },
        { status: 400 }
      );
    }

    // Get articles that don't have embeddings yet (process up to 500)
    const articlesWithoutEmbeddings = getArticlesWithoutEmbeddings(500);

    if (articlesWithoutEmbeddings.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All articles already have embeddings",
        generated: 0,
      });
    }

    // Generate embeddings
    const embeddings = await generateEmbeddings(articlesWithoutEmbeddings, openaiApiKey);

    // Save embeddings to database
    for (const [uri, embedding] of embeddings) {
      saveEmbedding(uri, embedding);
    }

    return NextResponse.json({
      success: true,
      generated: embeddings.size,
      total: articlesWithoutEmbeddings.length,
    });
  } catch (error) {
    console.error("Error generating embeddings:", error);
    return NextResponse.json(
      { error: "Failed to generate embeddings" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const embeddings = getAllEmbeddings();
    const articles = getCachedArticles(500);

    return NextResponse.json({
      embeddingsCount: embeddings.length,
      articlesCount: articles.length,
      articlesWithEmbeddings: embeddings.length,
      articlesWithoutEmbeddings: articles.length - embeddings.length,
    });
  } catch (error) {
    console.error("Error fetching embeddings status:", error);
    return NextResponse.json(
      { error: "Failed to fetch embeddings status" },
      { status: 500 }
    );
  }
}
