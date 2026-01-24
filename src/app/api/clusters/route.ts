import { NextRequest, NextResponse } from "next/server";
import {
  getAllEmbeddings,
  getCachedArticles,
  getClusters,
  saveCluster,
  clearClusters,
  getCachedArticle,
} from "@/lib/db";
import {
  getAllEmbeddingsCloud,
  getCachedArticlesCloud,
  getClustersCloud,
  saveClusterCloud,
  clearClustersCloud,
  getCachedArticleCloud,
} from "@/lib/db-cloud";
import { isTursoConfigured } from "@/lib/turso";
import { clusterArticles, generateClusterTitleAndSummary, sortClustersByRecency } from "@/lib/embeddings";
import type { Article, StoryCluster } from "@/lib/types";

export async function GET() {
  const useCloud = isTursoConfigured();

  try {
    // Get stored clusters
    const storedClusters = useCloud
      ? await getClustersCloud()
      : getClusters();

    if (storedClusters.length === 0) {
      return NextResponse.json({
        clusters: [],
        message: "No clusters found. Generate embeddings first, then rebuild clusters.",
      });
    }

    // Hydrate clusters with full article data
    const clustersPromises = storedClusters.map(async (cluster) => {
      const articlesPromises = cluster.articleUris.map((uri) =>
        useCloud ? getCachedArticleCloud(uri) : Promise.resolve(getCachedArticle(uri))
      );
      const articles = (await Promise.all(articlesPromises)).filter(
        (a): a is Article => a !== null
      );

      return {
        id: cluster.id,
        title: cluster.title,
        summary: cluster.summary || undefined,
        articles,
        keywords: cluster.keywords,
        timespan: {
          start: cluster.timespanStart,
          end: cluster.timespanEnd,
        },
        updatedAt: cluster.updatedAt,
      };
    });

    let clusters: StoryCluster[] = (await Promise.all(clustersPromises)).filter(
      (c) => c.articles.length >= 2
    );

    // Sort clusters by recency (most recent/developing stories first)
    clusters = sortClustersByRecency(clusters);

    return NextResponse.json({ clusters });
  } catch (error) {
    console.error("Error fetching clusters:", error);
    return NextResponse.json(
      { error: "Failed to fetch clusters" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const useCloud = isTursoConfigured();

  try {
    const { openaiApiKey, generateSummaries = false } = await request.json();

    // Get all embeddings and articles
    const embeddingsData = useCloud
      ? await getAllEmbeddingsCloud()
      : getAllEmbeddings();
    const articles = useCloud
      ? await getCachedArticlesCloud(500)
      : getCachedArticles(500);

    if (embeddingsData.length < 10) {
      return NextResponse.json({
        error: "Not enough embeddings. Generate embeddings for at least 10 articles first.",
        embeddingsCount: embeddingsData.length,
      }, { status: 400 });
    }

    // Create embeddings map
    const embeddings = new Map<string, number[]>();
    embeddingsData.forEach((e) => embeddings.set(e.uri, e.embedding));

    // Filter to only articles with embeddings
    const articlesWithEmbeddings = articles.filter((a) => embeddings.has(a.uri));

    // Cluster articles (lower threshold = groups more related articles together)
    // Using 0.58 for better grouping of related stories (e.g., winter storm, Greenland)
    const clusters = clusterArticles(articlesWithEmbeddings, embeddings, 0.58);

    // Clear old clusters
    if (useCloud) {
      await clearClustersCloud();
    } else {
      clearClusters();
    }

    // Generate titles and summaries, then save clusters
    for (const cluster of clusters) {
      let title = cluster.title;
      let summary = "";

      if (generateSummaries && openaiApiKey && cluster.articles.length >= 2) {
        try {
          const result = await generateClusterTitleAndSummary(cluster, openaiApiKey);
          title = result.title;
          summary = result.summary;
        } catch (e) {
          console.error("Failed to generate title/summary for cluster:", e);
        }
      }

      const clusterData = {
        id: cluster.id,
        title,
        summary,
        articleUris: cluster.articles.map((a) => a.uri),
        keywords: cluster.keywords,
        timespanStart: cluster.timespan.start,
        timespanEnd: cluster.timespan.end,
      };

      if (useCloud) {
        await saveClusterCloud(clusterData);
      } else {
        saveCluster(clusterData);
      }

      cluster.title = title;
      cluster.summary = summary;
    }

    return NextResponse.json({
      success: true,
      clustersCreated: clusters.length,
      articlesInClusters: clusters.reduce((sum, c) => sum + c.articles.length, 0),
      clusters: clusters.map((c) => ({
        id: c.id,
        title: c.title,
        summary: c.summary,
        articleCount: c.articles.length,
        keywords: c.keywords,
      })),
    });
  } catch (error) {
    console.error("Error creating clusters:", error);
    return NextResponse.json(
      { error: "Failed to create clusters" },
      { status: 500 }
    );
  }
}
