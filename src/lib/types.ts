// NYT API Response Types

export interface NYTMultimedia {
  url: string;
  format?: string;
  height: number;
  width: number;
  type?: string;
  subtype?: string;
  caption?: string;
  copyright?: string;
}

export interface NYTMedia {
  type: string;
  subtype: string;
  caption: string;
  copyright: string;
  approved_for_syndication?: boolean;
  "media-metadata"?: Array<{
    url: string;
    format: string;
    height: number;
    width: number;
  }>;
}

export interface NYTArticle {
  uri: string;
  url: string;
  title?: string;
  abstract?: string;
  snippet?: string;
  section: string;
  subsection?: string;
  byline: string | { original?: string };
  published_date?: string;
  pub_date?: string;
  updated_date?: string;
  created_date?: string;
  item_type?: string;
  type?: string;
  material_type_facet?: string;
  type_of_material?: string;
  kicker?: string;
  des_facet?: string[];
  org_facet?: string[] | string;
  per_facet?: string[];
  geo_facet?: string[];
  multimedia?: NYTMultimedia[] | NYTMedia[];
  media?: NYTMedia[];
  word_count?: number;
  source?: string;
  headline?: {
    main: string;
    kicker?: string;
    print_headline?: string;
  };
  keywords?: Array<{
    name: string;
    value: string;
    rank?: number;
  }>;
  desk?: string;
  news_desk?: string;
  section_name?: string;
  document_type?: string;
  web_url?: string;
  short_url?: string;
}

// Normalized article for our app
export interface Article {
  uri: string;
  url: string;
  title: string;
  abstract: string;
  section: string;
  subsection: string;
  byline: string;
  publishedDate: string;
  updatedDate: string;
  imageUrl: string | null;
  imageCaption: string | null;
  keywords: string[];
  people: string[];
  organizations: string[];
  locations: string[];
  materialType: string;
  wordCount: number;
  hasMultimedia: boolean;
  isInteractive: boolean;
  desk: string;
  source: string;
  relevanceScore?: number;
}

// User interaction types
export type InteractionType = "read" | "liked" | "dismissed" | "saved" | "opened";

export interface Interaction {
  id: number;
  articleUri: string;
  action: InteractionType;
  createdAt: string;
}

// Profile types
export interface ProfileEntry {
  id: number;
  category: string;
  value: string;
  score: number;
  updatedAt: string;
}

export interface UserProfile {
  sections: Record<string, number>;
  reporters: Record<string, number>;
  topics: Record<string, number>;
  organizations: Record<string, number>;
  locations: Record<string, number>;
  materialTypes: Record<string, number>;
  preferredWordCount: { min: number; max: number };
  prefersMultimedia: number;
  prefersInteractive: number;
  totalLikes: number;
  lastAnalyzed: string | null;
  aiInsights: string | null;
}

// API usage tracking
export interface ApiUsage {
  todayCalls: number;
  lastCallTime: number;
  dailyLimit: number;
  minuteLimit: number;
}

// Feed types
export type FeedSource = "top-stories" | "times-wire" | "most-popular" | "search";
export type FeedSection =
  | "home"
  | "for-you"
  | "saved"
  | "stories"
  | "politics"
  | "world"
  | "us"
  | "opinion"
  | "science"
  | "technology"
  | "climate"
  | "graphics"
  | "investigative"
  | "business"
  | "arts"
  | "books"
  | "magazine";

export interface FeedState {
  articles: Article[];
  loading: boolean;
  error: string | null;
  currentSection: FeedSection;
  lastRefresh: string | null;
}

// Story Cluster types
export interface ArticleEmbedding {
  uri: string;
  embedding: number[];
  createdAt: string;
}

export interface StoryCluster {
  id: string;
  title: string;
  summary?: string;
  articles: Article[];
  keywords: string[];
  timespan: {
    start: string;
    end: string;
  };
  updatedAt: string;
}
