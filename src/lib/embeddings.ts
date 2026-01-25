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

// Cluster articles based on embedding similarity (original algorithm)
export function clusterArticles(
  articles: Article[],
  embeddings: Map<string, number[]>,
  similarityThreshold: number = 0.68
): StoryCluster[] {
  const clusters: StoryCluster[] = [];
  const assigned = new Set<string>();

  // Sort articles by date (newest first) for better cluster naming
  const sortedArticles = [...articles].sort(
    (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
  );

  for (const article of sortedArticles) {
    if (assigned.has(article.uri)) continue;

    const embedding = embeddings.get(article.uri);
    if (!embedding) continue;

    // Find similar articles
    const clusterArticles: Article[] = [article];
    assigned.add(article.uri);

    for (const other of sortedArticles) {
      if (assigned.has(other.uri)) continue;

      const otherEmbedding = embeddings.get(other.uri);
      if (!otherEmbedding) continue;

      const similarity = cosineSimilarity(embedding, otherEmbedding);
      if (similarity >= similarityThreshold) {
        clusterArticles.push(other);
        assigned.add(other.uri);
      }
    }

    // Only create clusters with 2+ articles
    if (clusterArticles.length >= 2) {
      // Sort cluster articles by date
      clusterArticles.sort(
        (a, b) => new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime()
      );

      // Extract common keywords
      const keywordCounts = new Map<string, number>();
      clusterArticles.forEach((a) => {
        a.keywords.forEach((kw) => {
          keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1);
        });
      });

      // Get keywords that appear in multiple articles
      const commonKeywords = Array.from(keywordCounts.entries())
        .filter(([, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([kw]) => kw);

      // Generate cluster title from most common keywords or first article
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
  }

  // Sort clusters by number of articles (largest first)
  clusters.sort((a, b) => b.articles.length - a.articles.length);

  return clusters;
}

// Check if a title is generic/unhelpful
function isGenericTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    lower.includes("here's the latest") ||
    lower.includes("heres the latest") ||
    lower.includes("what we know") ||
    lower.includes("what to know") ||
    lower === "live updates" ||
    lower === "breaking news"
  );
}

// Generate a title and summary for a cluster using AI
export async function generateClusterTitleAndSummary(
  cluster: StoryCluster,
  openaiApiKey: string
): Promise<{ title: string; summary: string }> {
  const openai = new OpenAI({ apiKey: openaiApiKey });

  // Build article summaries, emphasizing abstract for generic titles
  const articleSummaries = cluster.articles
    .map((a, i) => {
      const titlePart = isGenericTitle(a.title)
        ? `[Live Blog]`
        : `"${a.title}"`;
      const keywordsPart = a.keywords.length > 0
        ? `\n   Keywords: ${a.keywords.slice(0, 5).join(", ")}`
        : "";
      return `${i + 1}. ${titlePart}\n   ${a.abstract}${keywordsPart}`;
    })
    .join("\n\n");

  // Check if this is a live blog cluster
  const hasLiveBlogs = cluster.articles.some((a) => isGenericTitle(a.title) || a.isLiveBlog);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a news editor. Given a cluster of related news articles, generate:
1. A compelling, specific headline (5-10 words) that captures WHAT the story is about
2. A brief 1-2 sentence summary of the key developments

IMPORTANT:
- Some articles may be marked as [Live Blog] with generic titles - focus on their ABSTRACTS and KEYWORDS to understand the actual topic
- The headline must be SPECIFIC about the subject (e.g., "Major Snowstorm Hits Northeast" not "Latest Developments")
- Never use generic phrases like "Latest Developments", "Ongoing Events", "Here's What's Happening"
${hasLiveBlogs ? "- This cluster contains live blogs - identify the BREAKING NEWS topic from the abstracts" : ""}

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

// Sort clusters by recency - live blogs first, then most recently updated stories
export function sortClustersByRecency(clusters: StoryCluster[]): StoryCluster[] {
  const now = new Date().getTime();
  const ONE_HOUR = 60 * 60 * 1000;
  const ONE_DAY = 24 * ONE_HOUR;

  const scored = clusters.map((cluster) => {
    // Check for live blogs in this cluster
    const hasLiveBlog = cluster.articles.some((a) => a.isLiveBlog);

    // Check if live blog was updated recently (within 6 hours)
    const liveBlogArticle = cluster.articles.find((a) => a.isLiveBlog);
    const isActiveLiveBlog = liveBlogArticle
      ? (now - new Date(liveBlogArticle.updatedDate).getTime()) < 6 * ONE_HOUR
      : false;

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

    // LIVE BLOG PRIORITY: Massive boost for active live blogs
    if (isActiveLiveBlog) {
      score += 10 * ONE_DAY; // Push to top - 10 days worth of boost
    } else if (hasLiveBlog) {
      score += 5 * ONE_DAY; // Still prioritize, but less than active ones
    }

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

    return { cluster, score, mostRecentDate, recentArticles, todayArticles, hasLiveBlog, isActiveLiveBlog };
  });

  // Sort by score (highest first = live blogs first, then most recent/developing)
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
