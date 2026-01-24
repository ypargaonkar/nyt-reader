import OpenAI from "openai";
import type { Article, StoryCluster, UserProfile } from "./types";

// Cosine similarity between two vectors
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

// Generate embeddings for articles using OpenAI
export async function generateEmbeddings(
  articles: Article[],
  openaiApiKey: string
): Promise<Map<string, number[]>> {
  const openai = new OpenAI({ apiKey: openaiApiKey });
  const embeddings = new Map<string, number[]>();

  // Batch articles for efficiency (OpenAI allows up to 2048 inputs per request)
  const batchSize = 100;

  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const inputs = batch.map((article) =>
      `${article.title}\n\n${article.abstract}\n\nKeywords: ${article.keywords.join(", ")}`
    );

    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: inputs,
      });

      response.data.forEach((item, index) => {
        const article = batch[index];
        embeddings.set(article.uri, item.embedding);
      });
    } catch (error) {
      console.error("Error generating embeddings:", error);
      throw error;
    }
  }

  return embeddings;
}

// Calculate centroid (average) of multiple embeddings
function calculateCentroid(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  const dim = embeddings[0].length;
  const centroid = new Array(dim).fill(0);

  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += emb[i];
    }
  }

  for (let i = 0; i < dim; i++) {
    centroid[i] /= embeddings.length;
  }

  return centroid;
}

// Cluster articles based on embedding similarity with improved algorithm
export function clusterArticles(
  articles: Article[],
  embeddings: Map<string, number[]>,
  similarityThreshold: number = 0.58 // Lowered for better grouping
): StoryCluster[] {
  const assigned = new Set<string>();

  // Sort articles by date (newest first)
  const sortedArticles = [...articles].sort(
    (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
  );

  // Phase 1: Initial clustering with centroid-based matching
  const rawClusters: { articles: Article[]; embeddings: number[][] }[] = [];

  for (const article of sortedArticles) {
    if (assigned.has(article.uri)) continue;

    const embedding = embeddings.get(article.uri);
    if (!embedding) continue;

    // Try to find an existing cluster this article fits into
    let bestClusterIdx = -1;
    let bestSimilarity = 0;

    for (let i = 0; i < rawClusters.length; i++) {
      const cluster = rawClusters[i];
      // Compare to cluster centroid
      const centroid = calculateCentroid(cluster.embeddings);
      const similarity = cosineSimilarity(embedding, centroid);

      // Also check similarity to any article in cluster (helps with diverse clusters)
      const maxArticleSim = Math.max(
        ...cluster.embeddings.map((e) => cosineSimilarity(embedding, e))
      );

      const effectiveSimilarity = Math.max(similarity, maxArticleSim * 0.95);

      if (effectiveSimilarity >= similarityThreshold && effectiveSimilarity > bestSimilarity) {
        bestSimilarity = effectiveSimilarity;
        bestClusterIdx = i;
      }
    }

    if (bestClusterIdx >= 0) {
      // Add to existing cluster
      rawClusters[bestClusterIdx].articles.push(article);
      rawClusters[bestClusterIdx].embeddings.push(embedding);
      assigned.add(article.uri);
    } else {
      // Start a new cluster
      rawClusters.push({
        articles: [article],
        embeddings: [embedding],
      });
      assigned.add(article.uri);
    }
  }

  // Phase 2: Merge similar clusters
  const mergeThreshold = 0.52; // Lower threshold for merging clusters
  let merged = true;

  while (merged) {
    merged = false;
    for (let i = 0; i < rawClusters.length; i++) {
      for (let j = i + 1; j < rawClusters.length; j++) {
        const centroidI = calculateCentroid(rawClusters[i].embeddings);
        const centroidJ = calculateCentroid(rawClusters[j].embeddings);
        const similarity = cosineSimilarity(centroidI, centroidJ);

        if (similarity >= mergeThreshold) {
          // Merge cluster j into cluster i
          rawClusters[i].articles.push(...rawClusters[j].articles);
          rawClusters[i].embeddings.push(...rawClusters[j].embeddings);
          rawClusters.splice(j, 1);
          merged = true;
          break;
        }
      }
      if (merged) break;
    }
  }

  // Phase 3: Convert to StoryCluster format (only clusters with 2+ articles)
  const clusters: StoryCluster[] = [];

  for (const raw of rawClusters) {
    if (raw.articles.length < 2) continue;

    const clusterArticles = [...raw.articles].sort(
      (a, b) => new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime()
    );

    // Extract common keywords
    const keywordCounts = new Map<string, number>();
    clusterArticles.forEach((a) => {
      a.keywords.forEach((kw) => {
        keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1);
      });
    });

    const commonKeywords = Array.from(keywordCounts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([kw]) => kw);

    const title = commonKeywords.length > 0
      ? commonKeywords.slice(0, 3).join(", ")
      : clusterArticles[0].title.split(":")[0].trim();

    clusters.push({
      id: `cluster-${Date.now()}-${clusters.length}`,
      title,
      articles: clusterArticles,
      keywords: commonKeywords,
      timespan: {
        start: clusterArticles[0].publishedDate,
        end: clusterArticles[clusterArticles.length - 1].publishedDate,
      },
      updatedAt: new Date().toISOString(),
    });
  }

  // Sort clusters by number of articles (largest first)
  clusters.sort((a, b) => b.articles.length - a.articles.length);

  return clusters;
}

// Generate a title and summary for a cluster using AI
export async function generateClusterTitleAndSummary(
  cluster: StoryCluster,
  openaiApiKey: string
): Promise<{ title: string; summary: string }> {
  const openai = new OpenAI({ apiKey: openaiApiKey });

  const articleSummaries = cluster.articles
    .map((a, i) => `${i + 1}. "${a.title}" - ${a.abstract}`)
    .join("\n\n");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a news editor. Given a cluster of related news articles, generate:
1. A compelling, concise headline (5-10 words) that captures the essence of the story
2. A brief 1-2 sentence summary of the key developments

Respond in JSON format: {"title": "...", "summary": "..."}`,
        },
        {
          role: "user",
          content: `Articles:\n${articleSummaries}`,
        },
      ],
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    return {
      title: parsed.title || cluster.articles[0].title.split(":")[0].trim(),
      summary: parsed.summary || "",
    };
  } catch (error) {
    console.error("Error generating cluster title/summary:", error);
    return {
      title: cluster.articles[0].title.split(":")[0].trim(),
      summary: "",
    };
  }
}

// Legacy function for backwards compatibility
export async function generateClusterSummary(
  cluster: StoryCluster,
  openaiApiKey: string
): Promise<string> {
  const result = await generateClusterTitleAndSummary(cluster, openaiApiKey);
  return result.summary;
}

// Score a cluster based on user profile relevance
export function scoreClusterByProfile(
  cluster: StoryCluster,
  profile: UserProfile | null,
  followedJournalists: Set<string>
): number {
  if (!profile) return cluster.articles.length; // Default to article count

  let score = 0;

  for (const article of cluster.articles) {
    // Section match (weight: 25)
    if (profile.sections[article.section]) {
      score += profile.sections[article.section] * 5;
    }

    // Topic/keyword match (weight: 30)
    for (const keyword of article.keywords) {
      if (profile.topics[keyword]) {
        score += profile.topics[keyword] * 3;
      }
    }

    // Reporter match (weight: 20)
    const bylineMatch = article.byline.match(/^By\s+(.+)/i);
    if (bylineMatch) {
      const reporters = bylineMatch[1].split(/\s+and\s+|,\s*/i);
      for (const reporter of reporters) {
        const cleanName = reporter.trim();
        if (profile.reporters[cleanName]) {
          score += profile.reporters[cleanName] * 4;
        }
        // Followed journalist bonus (big boost)
        if (followedJournalists.has(cleanName)) {
          score += 25;
        }
      }
    }

    // Organization match (weight: 10)
    for (const org of article.organizations) {
      if (profile.organizations[org]) {
        score += profile.organizations[org] * 2;
      }
    }

    // Location match (weight: 10)
    for (const loc of article.locations) {
      if (profile.locations[loc]) {
        score += profile.locations[loc] * 2;
      }
    }
  }

  // Bonus for cluster size (more articles = more significant story)
  score += cluster.articles.length * 5;

  return score;
}

// Sort clusters by profile relevance
export function sortClustersByRelevance(
  clusters: StoryCluster[],
  profile: UserProfile | null,
  followedJournalists: Set<string>
): StoryCluster[] {
  const scored = clusters.map((cluster) => ({
    cluster,
    score: scoreClusterByProfile(cluster, profile, followedJournalists),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.cluster);
}

// Sort clusters by recency - most recently updated stories first
export function sortClustersByRecency(clusters: StoryCluster[]): StoryCluster[] {
  const now = new Date().getTime();
  const ONE_HOUR = 60 * 60 * 1000;
  const ONE_DAY = 24 * ONE_HOUR;

  const scored = clusters.map((cluster) => {
    // Get most recent article date
    const mostRecentDate = Math.max(
      ...cluster.articles.map((a) => new Date(a.publishedDate).getTime())
    );

    // Count articles from last hour (developing story indicator)
    const recentArticles = cluster.articles.filter((a) => {
      const articleTime = new Date(a.publishedDate).getTime();
      return now - articleTime < ONE_HOUR;
    }).length;

    // Count articles from today
    const todayArticles = cluster.articles.filter((a) => {
      const articleTime = new Date(a.publishedDate).getTime();
      return now - articleTime < ONE_DAY;
    }).length;

    // Calculate recency score:
    // - Primary: most recent article timestamp (higher = more recent)
    // - Bonus for having multiple recent articles (developing story)
    // - Bonus for cluster size (bigger stories are more significant)
    let score = mostRecentDate;

    // Developing story bonus: multiple articles in last hour
    if (recentArticles >= 2) {
      score += recentArticles * ONE_HOUR; // Boost by 1 hour per recent article
    }

    // Active today bonus
    if (todayArticles >= 3) {
      score += todayArticles * (ONE_HOUR / 2); // Boost by 30 min per today article
    }

    // Cluster size gives a small boost (significant stories)
    score += cluster.articles.length * (ONE_HOUR / 6); // 10 min per article

    return { cluster, score, mostRecentDate, recentArticles, todayArticles };
  });

  // Sort by score (highest first = most recent/developing)
  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.cluster);
}

// Find related articles for a given article
export function findRelatedArticles(
  articleUri: string,
  embeddings: Map<string, number[]>,
  articles: Article[],
  limit: number = 5,
  minSimilarity: number = 0.6
): { article: Article; similarity: number }[] {
  const targetEmbedding = embeddings.get(articleUri);
  if (!targetEmbedding) return [];

  const similarities: { article: Article; similarity: number }[] = [];

  for (const article of articles) {
    if (article.uri === articleUri) continue;

    const embedding = embeddings.get(article.uri);
    if (!embedding) continue;

    const similarity = cosineSimilarity(targetEmbedding, embedding);
    if (similarity >= minSimilarity) {
      similarities.push({ article, similarity });
    }
  }

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
