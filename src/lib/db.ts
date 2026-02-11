import Database, { Database as DatabaseType } from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { Article, Interaction, ProfileEntry, InteractionType } from "./types";

// Check if we're in a serverless environment (Vercel)
const IS_SERVERLESS = process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Database file location
const DB_PATH = path.join(process.cwd(), "data", "reader.db");

// Lazy database initialization
let db: DatabaseType | null = null;
let dbInitFailed = false;

function getDb(): DatabaseType | null {
  if (dbInitFailed) return null;
  if (db) return db;

  // Skip DB initialization on serverless platforms
  if (IS_SERVERLESS) {
    dbInitFailed = true;
    return null;
  }

  try {
    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Create database connection
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("busy_timeout = 5000");

    // Initialize schema
    db.exec(`
      -- Articles cache
      CREATE TABLE IF NOT EXISTS articles (
        uri TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        fetched_at TEXT NOT NULL,
        section TEXT,
        byline TEXT
      );

      -- User interactions
      CREATE TABLE IF NOT EXISTS interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_uri TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      -- Create index for faster lookups
      CREATE INDEX IF NOT EXISTS idx_interactions_uri ON interactions(article_uri);
      CREATE INDEX IF NOT EXISTS idx_interactions_action ON interactions(action);

      -- Preference profile
      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        value TEXT NOT NULL,
        score REAL NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        UNIQUE(category, value)
      );

      -- AI analysis results
      CREATE TABLE IF NOT EXISTS ai_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        insights TEXT,
        analyzed_at TEXT NOT NULL,
        articles_analyzed INTEGER DEFAULT 0
      );

      -- API usage tracking
      CREATE TABLE IF NOT EXISTS api_calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT NOT NULL,
        called_at TEXT NOT NULL
      );

      -- Create index for date-based queries
      CREATE INDEX IF NOT EXISTS idx_api_calls_date ON api_calls(called_at);

      -- Followed journalists
      CREATE TABLE IF NOT EXISTS followed_journalists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        followed_at TEXT NOT NULL
      );

      -- Create index for journalist lookups
      CREATE INDEX IF NOT EXISTS idx_followed_journalists_name ON followed_journalists(name);

      -- Article embeddings for semantic clustering
      CREATE TABLE IF NOT EXISTS embeddings (
        uri TEXT PRIMARY KEY,
        embedding TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      -- Story clusters
      CREATE TABLE IF NOT EXISTS clusters (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT,
        article_uris TEXT NOT NULL,
        keywords TEXT,
        timespan_start TEXT,
        timespan_end TEXT,
        updated_at TEXT NOT NULL
      );
    `);

    return db;
  } catch (error) {
    console.warn("Database initialization failed (serverless environment?):", error);
    dbInitFailed = true;
    return null;
  }
}

// Article operations
export function cacheArticle(article: Article): void {
  const database = getDb();
  if (!database) return;
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO articles (uri, data, fetched_at, section, byline)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(
    article.uri,
    JSON.stringify(article),
    new Date().toISOString(),
    article.section,
    article.byline
  );
}

export function cacheArticles(articles: Article[]): void {
  const database = getDb();
  if (!database) return;
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO articles (uri, data, fetched_at, section, byline)
    VALUES (?, ?, ?, ?, ?)
  `);
  const transaction = database.transaction((items: Article[]) => {
    for (const article of items) {
      stmt.run(
        article.uri,
        JSON.stringify(article),
        new Date().toISOString(),
        article.section,
        article.byline
      );
    }
  });
  transaction(articles);
}

export function getCachedArticle(uri: string): Article | null {
  const database = getDb();
  if (!database) return null;
  const stmt = database.prepare("SELECT data FROM articles WHERE uri = ?");
  const row = stmt.get(uri) as { data: string } | undefined;
  return row ? JSON.parse(row.data) : null;
}

export function getCachedArticles(limit: number = 100): Article[] {
  const database = getDb();
  if (!database) return [];
  const stmt = database.prepare(`
    SELECT data FROM articles
    ORDER BY fetched_at DESC
    LIMIT ?
  `);
  const rows = stmt.all(limit) as { data: string }[];
  return rows.map((row) => JSON.parse(row.data));
}

// Interaction operations
export function recordInteraction(
  articleUri: string,
  action: InteractionType
): void {
  const database = getDb();
  if (!database) return;
  // Check if already has this interaction
  const existing = database
    .prepare(
      "SELECT id FROM interactions WHERE article_uri = ? AND action = ?"
    )
    .get(articleUri, action);

  if (!existing) {
    const stmt = database.prepare(`
      INSERT INTO interactions (article_uri, action, created_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(articleUri, action, new Date().toISOString());
  }
}

export function getInteractions(action?: InteractionType): Interaction[] {
  const database = getDb();
  if (!database) return [];
  let query = "SELECT * FROM interactions";
  if (action) {
    query += " WHERE action = ?";
  }
  query += " ORDER BY created_at DESC";

  const stmt = database.prepare(query);
  const rows = action ? stmt.all(action) : stmt.all();
  return rows as Interaction[];
}

export function getReadArticleUris(): Set<string> {
  const database = getDb();
  if (!database) return new Set();
  const stmt = database.prepare(
    "SELECT DISTINCT article_uri FROM interactions WHERE action IN ('read', 'dismissed')"
  );
  const rows = stmt.all() as { article_uri: string }[];
  return new Set(rows.map((r) => r.article_uri));
}

export function getLikedArticleUris(): Set<string> {
  const database = getDb();
  if (!database) return new Set();
  const stmt = database.prepare(
    "SELECT DISTINCT article_uri FROM interactions WHERE action = 'liked'"
  );
  const rows = stmt.all() as { article_uri: string }[];
  return new Set(rows.map((r) => r.article_uri));
}

export function getSavedArticleUris(): Set<string> {
  const database = getDb();
  if (!database) return new Set();
  const stmt = database.prepare(
    "SELECT DISTINCT article_uri FROM interactions WHERE action = 'saved'"
  );
  const rows = stmt.all() as { article_uri: string }[];
  return new Set(rows.map((r) => r.article_uri));
}

export function getSavedArticles(limit: number = 100): Article[] {
  const database = getDb();
  if (!database) return [];
  const stmt = database.prepare(`
    SELECT a.data
    FROM articles a
    INNER JOIN interactions i ON a.uri = i.article_uri
    WHERE i.action = 'saved'
    ORDER BY i.created_at DESC
    LIMIT ?
  `);
  const rows = stmt.all(limit) as { data: string }[];
  return rows.map((row) => JSON.parse(row.data));
}

export function isArticleSaved(uri: string): boolean {
  const database = getDb();
  if (!database) return false;
  const stmt = database.prepare(
    "SELECT id FROM interactions WHERE article_uri = ? AND action = 'saved'"
  );
  const row = stmt.get(uri);
  return !!row;
}

export function unsaveArticle(uri: string): void {
  const database = getDb();
  if (!database) return;
  const stmt = database.prepare(
    "DELETE FROM interactions WHERE article_uri = ? AND action = 'saved'"
  );
  stmt.run(uri);
}

export function getLikedArticles(limit: number = 50): Article[] {
  const database = getDb();
  if (!database) return [];
  const stmt = database.prepare(`
    SELECT a.data
    FROM articles a
    INNER JOIN interactions i ON a.uri = i.article_uri
    WHERE i.action = 'liked'
    ORDER BY i.created_at DESC
    LIMIT ?
  `);
  const rows = stmt.all(limit) as { data: string }[];
  return rows.map((row) => JSON.parse(row.data));
}

export function getLikedArticlesSince(days: number = 30, limit: number = 50): Article[] {
  const database = getDb();
  if (!database) return [];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffIso = cutoffDate.toISOString();

  const stmt = database.prepare(`
    SELECT a.data
    FROM articles a
    INNER JOIN interactions i ON a.uri = i.article_uri
    WHERE i.action = 'liked' AND i.created_at >= ?
    ORDER BY i.created_at DESC
    LIMIT ?
  `);
  const rows = stmt.all(cutoffIso, limit) as { data: string }[];
  return rows.map((row) => JSON.parse(row.data));
}

export function getUnanalyzedLikedCount(): number {
  const database = getDb();
  if (!database) return 0;
  const lastAnalysis = database
    .prepare("SELECT analyzed_at FROM ai_analysis ORDER BY analyzed_at DESC LIMIT 1")
    .get() as { analyzed_at: string } | undefined;

  if (!lastAnalysis) {
    const result = database
      .prepare("SELECT COUNT(*) as count FROM interactions WHERE action = 'liked'")
      .get() as { count: number };
    return result?.count || 0;
  }

  const stmt = database.prepare(`
    SELECT COUNT(*) as count
    FROM interactions
    WHERE action = 'liked' AND created_at > ?
  `);
  return (stmt.get(lastAnalysis.analyzed_at) as { count: number }).count;
}

// Profile operations
export function updateProfileScore(
  category: string,
  value: string,
  scoreIncrement: number
): void {
  const database = getDb();
  if (!database) return;
  const stmt = database.prepare(`
    INSERT INTO profile (category, value, score, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(category, value)
    DO UPDATE SET score = score + ?, updated_at = ?
  `);
  const now = new Date().toISOString();
  stmt.run(category, value, scoreIncrement, now, scoreIncrement, now);
}

export function deleteProfileEntry(category: string, value: string): void {
  const database = getDb();
  if (!database) return;
  const stmt = database.prepare(
    "DELETE FROM profile WHERE category = ? AND value = ?"
  );
  stmt.run(category, value);
}

export function setProfileScore(
  category: string,
  value: string,
  score: number
): void {
  const database = getDb();
  if (!database) return;
  const stmt = database.prepare(`
    INSERT INTO profile (category, value, score, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(category, value)
    DO UPDATE SET score = ?, updated_at = ?
  `);
  const now = new Date().toISOString();
  stmt.run(category, value, score, now, score, now);
}

export function getProfileEntries(category?: string): ProfileEntry[] {
  const database = getDb();
  if (!database) return [];
  let query = "SELECT * FROM profile";
  if (category) {
    query += " WHERE category = ?";
  }
  query += " ORDER BY score DESC";

  const stmt = database.prepare(query);
  const rows = category ? stmt.all(category) : stmt.all();
  return rows as ProfileEntry[];
}

export function getTopProfileEntries(
  category: string,
  limit: number = 10
): ProfileEntry[] {
  const database = getDb();
  if (!database) return [];
  const stmt = database.prepare(`
    SELECT * FROM profile
    WHERE category = ?
    ORDER BY score DESC
    LIMIT ?
  `);
  return stmt.all(category, limit) as ProfileEntry[];
}

// AI analysis operations
export function saveAiInsights(insights: string, articlesAnalyzed: number): void {
  const database = getDb();
  if (!database) return;
  const stmt = database.prepare(`
    INSERT INTO ai_analysis (insights, analyzed_at, articles_analyzed)
    VALUES (?, ?, ?)
  `);
  stmt.run(insights, new Date().toISOString(), articlesAnalyzed);
}

export function getLatestAiInsights(): { insights: string; analyzedAt: string } | null {
  const database = getDb();
  if (!database) return null;
  const stmt = database.prepare(`
    SELECT insights, analyzed_at as analyzedAt
    FROM ai_analysis
    ORDER BY analyzed_at DESC
    LIMIT 1
  `);
  return stmt.get() as { insights: string; analyzedAt: string } | null;
}

// API usage operations
export function recordApiCall(endpoint: string): void {
  const database = getDb();
  if (!database) return;
  const stmt = database.prepare(`
    INSERT INTO api_calls (endpoint, called_at)
    VALUES (?, ?)
  `);
  stmt.run(endpoint, new Date().toISOString());
}

export function getTodayApiCallCount(): number {
  const database = getDb();
  if (!database) return 0;
  const today = new Date().toISOString().split("T")[0];
  const stmt = database.prepare(`
    SELECT COUNT(*) as count
    FROM api_calls
    WHERE called_at >= ?
  `);
  return (stmt.get(today) as { count: number }).count;
}

export function getLastApiCallTime(): number | null {
  const database = getDb();
  if (!database) return null;
  const stmt = database.prepare(`
    SELECT called_at
    FROM api_calls
    ORDER BY called_at DESC
    LIMIT 1
  `);
  const row = stmt.get() as { called_at: string } | undefined;
  return row ? new Date(row.called_at).getTime() : null;
}

export function getRecentApiCalls(minutes: number = 1): number {
  const database = getDb();
  if (!database) return 0;
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  const stmt = database.prepare(`
    SELECT COUNT(*) as count
    FROM api_calls
    WHERE called_at >= ?
  `);
  return (stmt.get(since) as { count: number }).count;
}

// Cleanup old data
export function cleanupOldData(daysToKeep: number = 30): void {
  const database = getDb();
  if (!database) return;
  const cutoff = new Date(
    Date.now() - daysToKeep * 24 * 60 * 60 * 1000
  ).toISOString();

  database.prepare("DELETE FROM api_calls WHERE called_at < ?").run(cutoff);
  database.prepare("DELETE FROM articles WHERE fetched_at < ?").run(cutoff);
}

// Followed journalists operations
export function followJournalist(name: string): void {
  const database = getDb();
  if (!database) return;
  const stmt = database.prepare(`
    INSERT OR IGNORE INTO followed_journalists (name, followed_at)
    VALUES (?, ?)
  `);
  stmt.run(name, new Date().toISOString());
}

export function unfollowJournalist(name: string): void {
  const database = getDb();
  if (!database) return;
  const stmt = database.prepare("DELETE FROM followed_journalists WHERE name = ?");
  stmt.run(name);
}

export function isJournalistFollowed(name: string): boolean {
  const database = getDb();
  if (!database) return false;
  const stmt = database.prepare("SELECT id FROM followed_journalists WHERE name = ?");
  const row = stmt.get(name);
  return !!row;
}

export function getFollowedJournalists(): string[] {
  const database = getDb();
  if (!database) return [];
  const stmt = database.prepare("SELECT name FROM followed_journalists ORDER BY followed_at DESC");
  const rows = stmt.all() as { name: string }[];
  return rows.map((r) => r.name);
}

export function getFollowedJournalistsSet(): Set<string> {
  return new Set(getFollowedJournalists());
}

// Embedding operations
export function saveEmbedding(uri: string, embedding: number[]): void {
  const database = getDb();
  if (!database) return;
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO embeddings (uri, embedding, created_at)
    VALUES (?, ?, ?)
  `);
  stmt.run(uri, JSON.stringify(embedding), new Date().toISOString());
}

export function getEmbedding(uri: string): number[] | null {
  const database = getDb();
  if (!database) return null;
  const stmt = database.prepare("SELECT embedding FROM embeddings WHERE uri = ?");
  const row = stmt.get(uri) as { embedding: string } | undefined;
  return row ? JSON.parse(row.embedding) : null;
}

export function getAllEmbeddings(): { uri: string; embedding: number[] }[] {
  const database = getDb();
  if (!database) return [];
  const stmt = database.prepare("SELECT uri, embedding FROM embeddings");
  const rows = stmt.all() as { uri: string; embedding: string }[];
  return rows.map((row) => ({
    uri: row.uri,
    embedding: JSON.parse(row.embedding),
  }));
}

export function getArticlesWithoutEmbeddings(limit: number = 50): Article[] {
  const database = getDb();
  if (!database) return [];
  const stmt = database.prepare(`
    SELECT a.data
    FROM articles a
    LEFT JOIN embeddings e ON a.uri = e.uri
    WHERE e.uri IS NULL
    ORDER BY a.fetched_at DESC
    LIMIT ?
  `);
  const rows = stmt.all(limit) as { data: string }[];
  return rows.map((row) => JSON.parse(row.data));
}

// Cluster operations
export function saveCluster(cluster: {
  id: string;
  title: string;
  summary?: string;
  articleUris: string[];
  keywords: string[];
  timespanStart: string;
  timespanEnd: string;
}): void {
  const database = getDb();
  if (!database) return;
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO clusters (id, title, summary, article_uris, keywords, timespan_start, timespan_end, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    cluster.id,
    cluster.title,
    cluster.summary || null,
    JSON.stringify(cluster.articleUris),
    JSON.stringify(cluster.keywords),
    cluster.timespanStart,
    cluster.timespanEnd,
    new Date().toISOString()
  );
}

export function getClusters(): {
  id: string;
  title: string;
  summary: string | null;
  articleUris: string[];
  keywords: string[];
  timespanStart: string;
  timespanEnd: string;
  updatedAt: string;
}[] {
  const database = getDb();
  if (!database) return [];
  const stmt = database.prepare(`
    SELECT id, title, summary, article_uris, keywords, timespan_start, timespan_end, updated_at
    FROM clusters
    ORDER BY updated_at DESC
  `);
  const rows = stmt.all() as {
    id: string;
    title: string;
    summary: string | null;
    article_uris: string;
    keywords: string;
    timespan_start: string;
    timespan_end: string;
    updated_at: string;
  }[];
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    articleUris: JSON.parse(row.article_uris),
    keywords: JSON.parse(row.keywords),
    timespanStart: row.timespan_start,
    timespanEnd: row.timespan_end,
    updatedAt: row.updated_at,
  }));
}

export function clearClusters(): void {
  const database = getDb();
  if (!database) return;
  database.prepare("DELETE FROM clusters").run();
}

export default getDb;
