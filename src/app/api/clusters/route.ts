import { NextRequest, NextResponse } from "next/server";
import {
  getAllEmbeddings,
  getCachedArticles,
  getClusters,
  saveCluster,
  clearClusters,
  getCachedArticle,
} from "@/lib/db";
import { clusterArticles, generateClusterTitleAndSummary, sortClustersByRelevance } from "@/lib/embeddings";
import { getProfileEntries, getFollowedJournalists } from "@/lib/db";
import type { UserProfile } from "@/lib/types";
import type { Article, StoryCluster } from "@/lib/types";

export async function GET() {
  try {
    // Get stored clusters
    const storedClusters = getClusters();

    if (storedClusters.length === 0) {
      return NextResponse.json({
        clusters: [],
        message: "No clusters found. Generate embeddings first, then rebuild clusters.",
      });
    }

    // Hydrate clusters with full article data
    let clusters: StoryCluster[] = storedClusters.map((cluster) => {
      const articles: Article[] = cluster.articleUris
        .map((uri) => getCachedArticle(uri))
        .filter((a): a is Article => a !== null);

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
    }).filter((c) => c.articles.length >= 2);

    // Build user profile for relevance sorting
    const profileEntries = getProfileEntries();
    const followedJournalists = new Set(getFollowedJournalists());

    const profile: UserProfile = {
      sections: {},
      reporters: {},
      topics: {},
      organizations: {},
      locations: {},
      materialTypes: {},
      preferredWordCount: { min: 0, max: 10000 },
      prefersMultimedia: 0,
      prefersInteractive: 0,
      totalLikes: 0,
      lastAnalyzed: null,
      aiInsights: null,
    };

    // Populate profile from entries
    for (const entry of profileEntries) {
      switch (entry.category) {
        case "section":
          profile.sections[entry.value] = entry.score;
          break;
        case "reporter":
          profile.reporters[entry.value] = entry.score;
          break;
        case "topic":
          profile.topics[entry.value] = entry.score;
          break;
        case "organization":
          profile.organizations[entry.value] = entry.score;
          break;
        case "location":
          profile.locations[entry.value] = entry.score;
          break;
      }
    }

    // Sort clusters by relevance to user profile
    clusters = sortClustersByRelevance(clusters, profile, followedJournalists);

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
  try {
    const { openaiApiKey, generateSummaries = false } = await request.json();

    // Get all embeddings and articles
    const embeddingsData = getAllEmbeddings();
    const articles = getCachedArticles(500);

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

    // Cluster articles (lower threshold = more clusters, higher = stricter grouping)
    const clusters = clusterArticles(articlesWithEmbeddings, embeddings, 0.68);

    // Clear old clusters
    clearClusters();

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

      saveCluster({
        id: cluster.id,
        title,
        summary,
        articleUris: cluster.articles.map((a) => a.uri),
        keywords: cluster.keywords,
        timespanStart: cluster.timespan.start,
        timespanEnd: cluster.timespan.end,
      });

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
