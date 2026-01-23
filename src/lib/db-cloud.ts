import { getTursoClient, initTursoSchema, isTursoConfigured } from "./turso";
import type { Article, Interaction, ProfileEntry, InteractionType } from "./types";

// Track if schema has been initialized
let schemaInitialized = false;

async function ensureSchema() {
  if (!schemaInitialized && isTursoConfigured()) {
    await initTursoSchema();
    schemaInitialized = true;
  }
}

// Article operations
export async function cacheArticleCloud(article: Article): Promise<void> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return;

  await client.execute({
    sql: `INSERT OR REPLACE INTO articles (uri, data, fetched_at, section, byline) VALUES (?, ?, ?, ?, ?)`,
    args: [article.uri, JSON.stringify(article), new Date().toISOString(), article.section, article.byline],
  });
}

export async function cacheArticlesCloud(articles: Article[]): Promise<void> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return;

  const batch = articles.map((article) => ({
    sql: `INSERT OR REPLACE INTO articles (uri, data, fetched_at, section, byline) VALUES (?, ?, ?, ?, ?)`,
    args: [article.uri, JSON.stringify(article), new Date().toISOString(), article.section, article.byline],
  }));

  await client.batch(batch as any);
}

export async function getCachedArticleCloud(uri: string): Promise<Article | null> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return null;

  const result = await client.execute({
    sql: `SELECT data FROM articles WHERE uri = ?`,
    args: [uri],
  });

  if (result.rows.length === 0) return null;
  return JSON.parse(result.rows[0].data as string);
}

export async function getCachedArticlesCloud(limit: number = 100): Promise<Article[]> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return [];

  const result = await client.execute({
    sql: `SELECT data FROM articles ORDER BY fetched_at DESC LIMIT ?`,
    args: [limit],
  });

  return result.rows.map((row) => JSON.parse(row.data as string));
}

// Interaction operations
export async function recordInteractionCloud(articleUri: string, action: InteractionType): Promise<void> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return;

  // Check if already exists
  const existing = await client.execute({
    sql: `SELECT id FROM interactions WHERE article_uri = ? AND action = ?`,
    args: [articleUri, action],
  });

  if (existing.rows.length === 0) {
    await client.execute({
      sql: `INSERT INTO interactions (article_uri, action, created_at) VALUES (?, ?, ?)`,
      args: [articleUri, action, new Date().toISOString()],
    });
  }
}

export async function getInteractionsCloud(action?: InteractionType): Promise<Interaction[]> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return [];

  let result;
  if (action) {
    result = await client.execute({
      sql: `SELECT id, article_uri as articleUri, action, created_at as createdAt FROM interactions WHERE action = ? ORDER BY created_at DESC`,
      args: [action],
    });
  } else {
    result = await client.execute({
      sql: `SELECT id, article_uri as articleUri, action, created_at as createdAt FROM interactions ORDER BY created_at DESC`,
      args: [],
    });
  }

  return result.rows.map((row) => ({
    id: row.id as number,
    articleUri: row.articleUri as string,
    action: row.action as InteractionType,
    createdAt: row.createdAt as string,
  }));
}

export async function getReadArticleUrisCloud(): Promise<Set<string>> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return new Set();

  const result = await client.execute({
    sql: `SELECT DISTINCT article_uri FROM interactions WHERE action IN ('read', 'dismissed')`,
    args: [],
  });

  return new Set(result.rows.map((r) => r.article_uri as string));
}

export async function getLikedArticleUrisCloud(): Promise<Set<string>> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return new Set();

  const result = await client.execute({
    sql: `SELECT DISTINCT article_uri FROM interactions WHERE action = 'liked'`,
    args: [],
  });

  return new Set(result.rows.map((r) => r.article_uri as string));
}

export async function getSavedArticleUrisCloud(): Promise<Set<string>> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return new Set();

  const result = await client.execute({
    sql: `SELECT DISTINCT article_uri FROM interactions WHERE action = 'saved'`,
    args: [],
  });

  return new Set(result.rows.map((r) => r.article_uri as string));
}

export async function getSavedArticlesCloud(limit: number = 100): Promise<Article[]> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return [];

  const result = await client.execute({
    sql: `SELECT a.data FROM articles a INNER JOIN interactions i ON a.uri = i.article_uri WHERE i.action = 'saved' ORDER BY i.created_at DESC LIMIT ?`,
    args: [limit],
  });

  return result.rows.map((row) => JSON.parse(row.data as string));
}

export async function unsaveArticleCloud(uri: string): Promise<void> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return;

  await client.execute({
    sql: `DELETE FROM interactions WHERE article_uri = ? AND action = 'saved'`,
    args: [uri],
  });
}

export async function isArticleSavedCloud(uri: string): Promise<boolean> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return false;

  const result = await client.execute({
    sql: `SELECT id FROM interactions WHERE article_uri = ? AND action = 'saved'`,
    args: [uri],
  });

  return result.rows.length > 0;
}

export async function getLikedArticlesCloud(limit: number = 50): Promise<Article[]> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return [];

  const result = await client.execute({
    sql: `SELECT a.data FROM articles a INNER JOIN interactions i ON a.uri = i.article_uri WHERE i.action = 'liked' ORDER BY i.created_at DESC LIMIT ?`,
    args: [limit],
  });

  return result.rows.map((row) => JSON.parse(row.data as string));
}

export async function getUnanalyzedLikedCountCloud(): Promise<number> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return 0;

  const lastAnalysis = await client.execute({
    sql: `SELECT analyzed_at FROM ai_analysis ORDER BY analyzed_at DESC LIMIT 1`,
    args: [],
  });

  if (lastAnalysis.rows.length === 0) {
    const result = await client.execute({
      sql: `SELECT COUNT(*) as count FROM interactions WHERE action = 'liked'`,
      args: [],
    });
    return (result.rows[0]?.count as number) || 0;
  }

  const result = await client.execute({
    sql: `SELECT COUNT(*) as count FROM interactions WHERE action = 'liked' AND created_at > ?`,
    args: [lastAnalysis.rows[0].analyzed_at as string],
  });

  return (result.rows[0]?.count as number) || 0;
}

// Profile operations
export async function updateProfileScoreCloud(category: string, value: string, scoreIncrement: number): Promise<void> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return;

  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO profile (category, value, score, updated_at) VALUES (?, ?, ?, ?)
          ON CONFLICT(category, value) DO UPDATE SET score = score + ?, updated_at = ?`,
    args: [category, value, scoreIncrement, now, scoreIncrement, now],
  });
}

export async function getProfileEntriesCloud(category?: string): Promise<ProfileEntry[]> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return [];

  let result;
  if (category) {
    result = await client.execute({
      sql: `SELECT id, category, value, score, updated_at as updatedAt FROM profile WHERE category = ? ORDER BY score DESC`,
      args: [category],
    });
  } else {
    result = await client.execute({
      sql: `SELECT id, category, value, score, updated_at as updatedAt FROM profile ORDER BY score DESC`,
      args: [],
    });
  }

  return result.rows.map((row) => ({
    id: row.id as number,
    category: row.category as string,
    value: row.value as string,
    score: row.score as number,
    updatedAt: row.updatedAt as string,
  }));
}

export async function getTopProfileEntriesCloud(category: string, limit: number = 10): Promise<ProfileEntry[]> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return [];

  const result = await client.execute({
    sql: `SELECT id, category, value, score, updated_at as updatedAt FROM profile WHERE category = ? ORDER BY score DESC LIMIT ?`,
    args: [category, limit],
  });

  return result.rows.map((row) => ({
    id: row.id as number,
    category: row.category as string,
    value: row.value as string,
    score: row.score as number,
    updatedAt: row.updatedAt as string,
  }));
}

// AI analysis
export async function saveAiInsightsCloud(insights: string, articlesAnalyzed: number): Promise<void> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return;

  await client.execute({
    sql: `INSERT INTO ai_analysis (insights, analyzed_at, articles_analyzed) VALUES (?, ?, ?)`,
    args: [insights, new Date().toISOString(), articlesAnalyzed],
  });
}

export async function getLatestAiInsightsCloud(): Promise<{ insights: string; analyzedAt: string } | null> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return null;

  const result = await client.execute({
    sql: `SELECT insights, analyzed_at as analyzedAt FROM ai_analysis ORDER BY analyzed_at DESC LIMIT 1`,
    args: [],
  });

  if (result.rows.length === 0) return null;
  return {
    insights: result.rows[0].insights as string,
    analyzedAt: result.rows[0].analyzedAt as string,
  };
}

// Followed journalists
export async function followJournalistCloud(name: string): Promise<void> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return;

  await client.execute({
    sql: `INSERT OR IGNORE INTO followed_journalists (name, followed_at) VALUES (?, ?)`,
    args: [name, new Date().toISOString()],
  });
}

export async function unfollowJournalistCloud(name: string): Promise<void> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return;

  await client.execute({
    sql: `DELETE FROM followed_journalists WHERE name = ?`,
    args: [name],
  });
}

export async function getFollowedJournalistsCloud(): Promise<string[]> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return [];

  const result = await client.execute({
    sql: `SELECT name FROM followed_journalists ORDER BY followed_at DESC`,
    args: [],
  });

  return result.rows.map((r) => r.name as string);
}

export async function isJournalistFollowedCloud(name: string): Promise<boolean> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return false;

  const result = await client.execute({
    sql: `SELECT id FROM followed_journalists WHERE name = ?`,
    args: [name],
  });

  return result.rows.length > 0;
}

// Embeddings
export async function saveEmbeddingCloud(uri: string, embedding: number[]): Promise<void> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return;

  await client.execute({
    sql: `INSERT OR REPLACE INTO embeddings (uri, embedding, created_at) VALUES (?, ?, ?)`,
    args: [uri, JSON.stringify(embedding), new Date().toISOString()],
  });
}

export async function getEmbeddingCloud(uri: string): Promise<number[] | null> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return null;

  const result = await client.execute({
    sql: `SELECT embedding FROM embeddings WHERE uri = ?`,
    args: [uri],
  });

  if (result.rows.length === 0) return null;
  return JSON.parse(result.rows[0].embedding as string);
}

export async function getAllEmbeddingsCloud(): Promise<{ uri: string; embedding: number[] }[]> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return [];

  const result = await client.execute({
    sql: `SELECT uri, embedding FROM embeddings`,
    args: [],
  });

  return result.rows.map((row) => ({
    uri: row.uri as string,
    embedding: JSON.parse(row.embedding as string),
  }));
}

export async function getArticlesWithoutEmbeddingsCloud(limit: number = 50): Promise<Article[]> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return [];

  const result = await client.execute({
    sql: `SELECT a.data FROM articles a LEFT JOIN embeddings e ON a.uri = e.uri WHERE e.uri IS NULL ORDER BY a.fetched_at DESC LIMIT ?`,
    args: [limit],
  });

  return result.rows.map((row) => JSON.parse(row.data as string));
}

// Clusters
export async function saveClusterCloud(cluster: {
  id: string;
  title: string;
  summary?: string;
  articleUris: string[];
  keywords: string[];
  timespanStart: string;
  timespanEnd: string;
}): Promise<void> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return;

  await client.execute({
    sql: `INSERT OR REPLACE INTO clusters (id, title, summary, article_uris, keywords, timespan_start, timespan_end, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      cluster.id,
      cluster.title,
      cluster.summary || null,
      JSON.stringify(cluster.articleUris),
      JSON.stringify(cluster.keywords),
      cluster.timespanStart,
      cluster.timespanEnd,
      new Date().toISOString(),
    ],
  });
}

export async function getClustersCloud(): Promise<{
  id: string;
  title: string;
  summary: string | null;
  articleUris: string[];
  keywords: string[];
  timespanStart: string;
  timespanEnd: string;
  updatedAt: string;
}[]> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return [];

  const result = await client.execute({
    sql: `SELECT id, title, summary, article_uris, keywords, timespan_start, timespan_end, updated_at FROM clusters ORDER BY updated_at DESC`,
    args: [],
  });

  return result.rows.map((row) => ({
    id: row.id as string,
    title: row.title as string,
    summary: row.summary as string | null,
    articleUris: JSON.parse(row.article_uris as string),
    keywords: JSON.parse(row.keywords as string),
    timespanStart: row.timespan_start as string,
    timespanEnd: row.timespan_end as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function clearClustersCloud(): Promise<void> {
  await ensureSchema();
  const client = getTursoClient();
  if (!client) return;

  await client.execute({
    sql: `DELETE FROM clusters`,
    args: [],
  });
}
