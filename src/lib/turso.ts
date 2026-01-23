import { createClient, Client } from "@libsql/client";

// Turso client singleton
let tursoClient: Client | null = null;

export function getTursoClient(): Client | null {
  if (tursoClient) return tursoClient;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    return null;
  }

  tursoClient = createClient({
    url,
    authToken,
  });

  return tursoClient;
}

// Initialize Turso schema
export async function initTursoSchema(): Promise<void> {
  const client = getTursoClient();
  if (!client) return;

  await client.executeMultiple(`
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

    -- Followed journalists
    CREATE TABLE IF NOT EXISTS followed_journalists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      followed_at TEXT NOT NULL
    );

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
}

// Check if Turso is configured
export function isTursoConfigured(): boolean {
  return !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}
