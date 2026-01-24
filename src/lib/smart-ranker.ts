import type { Article, UserProfile } from "./types";

// Engagement pattern data from API
export interface EngagementData {
  // Keywords/sections that converted (opened → liked)
  likedKeywords: Record<string, number>;
  likedSections: Record<string, number>;
  likedReporters: Record<string, number>;
  // Keywords/sections that didn't convert (opened but not liked)
  skippedKeywords: Record<string, number>;
  skippedSections: Record<string, number>;
  // Conversion stats
  conversionRate: number;
}

interface RankingConfig {
  serendipityFactor: number; // 0-1: how much randomness to inject
  fatigueThreshold: number; // articles in same topic before fatigue kicks in
  recencyDecayDays: number; // days before preference weight halves
  boostFollowedJournalists: number; // score boost for followed journalists
  boostEmbeddingSimilarity: number; // max boost from embedding similarity
}

const DEFAULT_CONFIG: RankingConfig = {
  serendipityFactor: 0.15, // 15% randomness
  fatigueThreshold: 3, // after 3 articles in same section, reduce priority
  recencyDecayDays: 14, // 2 weeks half-life
  boostFollowedJournalists: 30,
  boostEmbeddingSimilarity: 20,
};

interface ScoredArticle extends Article {
  relevanceScore: number;
  rankingFactors: {
    baseScore: number;
    recencyBoost: number;
    journalistBoost: number;
    embeddingBoost: number;
    engagementBoost: number;
    fatigueAdjustment: number;
    serendipityBoost: number;
    negativeAdjustment: number;
  };
}

// Parse byline to extract journalist names
function parseBylineNames(byline: string): string[] {
  if (!byline) return [];
  const cleaned = byline.replace(/^By\s+/i, "").trim();
  if (!cleaned) return [];
  const names = cleaned.split(/\s+and\s+|,\s*(?=\S)|;\s*/i);
  return names
    .map((name) => name.trim().toLowerCase())
    .filter((name) => name.length > 2);
}

// Calculate base relevance score (profile matching)
function calculateBaseScore(article: Article, profile: UserProfile): number {
  let score = 0;

  // Section match (weight: 25)
  const sectionScore = profile.sections[article.section] || 0;
  const maxSectionScore = Math.max(...Object.values(profile.sections), 1);
  score += (sectionScore / maxSectionScore) * 25;

  // Topic/keyword match (weight: 25)
  let topicScore = 0;
  article.keywords.forEach((keyword) => {
    topicScore += profile.topics[keyword] || 0;
  });
  const maxTopicScore = Math.max(...Object.values(profile.topics), 1);
  score += Math.min((topicScore / maxTopicScore) * 25, 25);

  // Reporter match (weight: 15)
  const bylineWords = article.byline.toLowerCase();
  let reporterScore = 0;
  Object.entries(profile.reporters).forEach(([reporter, weight]) => {
    if (bylineWords.includes(reporter.toLowerCase())) {
      reporterScore = Math.max(reporterScore, weight);
    }
  });
  const maxReporterScore = Math.max(...Object.values(profile.reporters), 1);
  score += (reporterScore / maxReporterScore) * 15;

  // Organization match (weight: 10)
  let orgScore = 0;
  article.organizations.forEach((org) => {
    orgScore += profile.organizations[org] || 0;
  });
  if (orgScore > 0) {
    const maxOrgScore = Math.max(...Object.values(profile.organizations), 1);
    score += Math.min((orgScore / maxOrgScore) * 10, 10);
  }

  // Location match (weight: 10)
  let locScore = 0;
  article.locations.forEach((loc) => {
    locScore += profile.locations[loc] || 0;
  });
  if (locScore > 0) {
    const maxLocScore = Math.max(...Object.values(profile.locations), 1);
    score += Math.min((locScore / maxLocScore) * 10, 10);
  }

  return score;
}

// Calculate recency boost (newer articles get slight boost)
function calculateRecencyBoost(article: Article): number {
  const now = new Date();
  const published = new Date(article.publishedDate);
  const hoursAgo = (now.getTime() - published.getTime()) / (1000 * 60 * 60);

  if (hoursAgo < 1) return 15; // Breaking news
  if (hoursAgo < 6) return 10; // Very recent
  if (hoursAgo < 24) return 5; // Today
  if (hoursAgo < 48) return 2; // Yesterday
  return 0;
}

// Calculate journalist boost for followed journalists
function calculateJournalistBoost(
  article: Article,
  followedJournalists: Set<string>,
  config: RankingConfig
): number {
  if (!followedJournalists || followedJournalists.size === 0) return 0;

  const articleAuthors = parseBylineNames(article.byline);
  const isFromFollowed = articleAuthors.some((author) => {
    for (const followed of followedJournalists) {
      if (
        author.includes(followed.toLowerCase()) ||
        followed.toLowerCase().includes(author)
      ) {
        return true;
      }
    }
    return false;
  });

  return isFromFollowed ? config.boostFollowedJournalists : 0;
}

// Calculate embedding similarity boost
// Note: Embeddings are calculated server-side, this is a placeholder for future API integration
function calculateEmbeddingBoost(
  article: Article,
  likedArticleUris: Set<string>,
  config: RankingConfig
): number {
  // For now, return 0 since embedding calculation requires server-side access
  // This will be enhanced when we add an API endpoint for similarity scoring
  return 0;
}

// Calculate engagement boost based on historical patterns
function calculateEngagementBoost(
  article: Article,
  engagementData: EngagementData | null
): number {
  if (!engagementData) return 0;

  let boost = 0;

  // Boost for keywords that historically converted (opened → liked)
  article.keywords.forEach((keyword) => {
    const likedCount = engagementData.likedKeywords[keyword] || 0;
    const skippedCount = engagementData.skippedKeywords[keyword] || 0;

    if (likedCount > 0) {
      // Strong positive signal: keyword appears in liked articles
      boost += Math.min(likedCount * 3, 12); // Max +12 per keyword match
    }
    if (skippedCount > likedCount) {
      // Weak negative signal: keyword more often skipped than liked
      boost -= Math.min((skippedCount - likedCount) * 1.5, 6); // Max -6 per keyword
    }
  });

  // Boost for sections that converted well
  const sectionLiked = engagementData.likedSections[article.section] || 0;
  const sectionSkipped = engagementData.skippedSections[article.section] || 0;

  if (sectionLiked > 0) {
    boost += Math.min(sectionLiked * 2, 10); // Max +10 for section
  }
  if (sectionSkipped > sectionLiked * 2) {
    // Section has poor conversion rate
    boost -= Math.min((sectionSkipped - sectionLiked) * 1, 8); // Max -8
  }

  // Boost for reporters who have high conversion
  const bylineWords = article.byline.toLowerCase();
  Object.entries(engagementData.likedReporters).forEach(([reporter, count]) => {
    if (bylineWords.includes(reporter.toLowerCase())) {
      boost += Math.min(count * 4, 15); // Max +15 for liked reporter
    }
  });

  // Cap total engagement boost
  return Math.max(-15, Math.min(25, boost));
}

// Calculate topic fatigue adjustment
function calculateFatigueAdjustment(
  article: Article,
  sectionCounts: Map<string, number>,
  config: RankingConfig
): number {
  const sectionCount = sectionCounts.get(article.section) || 0;

  if (sectionCount >= config.fatigueThreshold) {
    // Reduce score based on how many we've already shown
    const overThreshold = sectionCount - config.fatigueThreshold;
    return -Math.min(overThreshold * 5, 20); // Max -20 penalty
  }

  return 0;
}

// Calculate negative adjustment from dismissed articles
function calculateNegativeAdjustment(
  article: Article,
  dismissedKeywords: Set<string>,
  dismissedSections: Map<string, number>
): number {
  let penalty = 0;

  // Penalty for keywords that appear in dismissed articles
  article.keywords.forEach((keyword) => {
    if (dismissedKeywords.has(keyword.toLowerCase())) {
      penalty -= 3;
    }
  });

  // Penalty for sections with many dismissals
  const sectionDismissals = dismissedSections.get(article.section) || 0;
  if (sectionDismissals > 3) {
    penalty -= Math.min(sectionDismissals, 10);
  }

  return penalty;
}

// Simple deterministic hash from string to number between 0-1
function hashToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Normalize to 0-1 range
  return Math.abs(hash % 1000) / 1000;
}

// Calculate serendipity boost (deterministic diversity injection)
function calculateSerendipityBoost(
  article: Article,
  baseScore: number,
  config: RankingConfig
): number {
  // Lower scoring articles get a chance to appear higher
  // This helps break filter bubbles
  // Use deterministic hash so ranking is stable across re-renders
  const hash = hashToNumber(article.uri);
  if (baseScore < 30 && hash < config.serendipityFactor) {
    // Second hash for boost amount (use uri + "boost" for different value)
    const boostHash = hashToNumber(article.uri + "boost");
    return boostHash * 25; // Deterministic boost up to 25 points
  }
  return 0;
}

// Main ranking function
export function rankArticles(
  articles: Article[],
  profile: UserProfile | null,
  followedJournalists: Set<string>,
  likedArticleUris: Set<string>,
  dismissedArticleUris: Set<string>,
  engagementData: EngagementData | null = null,
  config: Partial<RankingConfig> = {}
): ScoredArticle[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Build dismissed keywords and sections from dismissed articles
  const dismissedKeywords = new Set<string>();
  const dismissedSections = new Map<string, number>();

  // Track section counts for fatigue
  const sectionCounts = new Map<string, number>();

  // Score all articles
  const scoredArticles: ScoredArticle[] = articles.map((article) => {
    const baseScore = profile ? calculateBaseScore(article, profile) : 20;
    const recencyBoost = calculateRecencyBoost(article);
    const journalistBoost = calculateJournalistBoost(
      article,
      followedJournalists,
      finalConfig
    );
    const embeddingBoost = calculateEmbeddingBoost(
      article,
      likedArticleUris,
      finalConfig
    );
    const engagementBoost = calculateEngagementBoost(article, engagementData);
    const fatigueAdjustment = calculateFatigueAdjustment(
      article,
      sectionCounts,
      finalConfig
    );
    const negativeAdjustment = calculateNegativeAdjustment(
      article,
      dismissedKeywords,
      dismissedSections
    );
    const serendipityBoost = calculateSerendipityBoost(article, baseScore, finalConfig);

    const totalScore = Math.max(
      0,
      Math.min(
        100,
        baseScore +
          recencyBoost +
          journalistBoost +
          embeddingBoost +
          engagementBoost +
          fatigueAdjustment +
          negativeAdjustment +
          serendipityBoost
      )
    );

    // Update section count for fatigue tracking as we go
    const count = sectionCounts.get(article.section) || 0;
    sectionCounts.set(article.section, count + 1);

    return {
      ...article,
      relevanceScore: Math.round(totalScore),
      rankingFactors: {
        baseScore,
        recencyBoost,
        journalistBoost,
        embeddingBoost,
        engagementBoost,
        fatigueAdjustment,
        serendipityBoost,
        negativeAdjustment,
      },
    };
  });

  // Sort by score (highest first)
  scoredArticles.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return scoredArticles;
}

// Categorize articles for newspaper layout
export interface NewspaperLayout {
  hero: ScoredArticle | null;
  featured: ScoredArticle[];
  standard: ScoredArticle[];
  compact: ScoredArticle[];
}

export function categorizeForNewspaper(
  articles: ScoredArticle[],
  options: {
    heroThreshold?: number;
    featuredCount?: number;
    standardCount?: number;
  } = {}
): NewspaperLayout {
  const { heroThreshold = 70, featuredCount = 4, standardCount = 6 } = options;

  const layout: NewspaperLayout = {
    hero: null,
    featured: [],
    standard: [],
    compact: [],
  };

  if (articles.length === 0) return layout;

  // Hero: highest scoring article above threshold, must have image
  const heroCandidate = articles.find(
    (a) => a.relevanceScore >= heroThreshold && a.imageUrl
  );

  if (heroCandidate) {
    layout.hero = heroCandidate;
  } else if (articles[0]?.imageUrl) {
    // Fallback to top article if it has an image
    layout.hero = articles[0];
  }

  // Get remaining articles (excluding hero)
  const remaining = articles.filter((a) => a !== layout.hero);

  // Featured: next N high-scoring articles with images
  const withImages = remaining.filter((a) => a.imageUrl);
  const withoutImages = remaining.filter((a) => !a.imageUrl);

  layout.featured = withImages.slice(0, featuredCount);

  // Standard: next batch
  const afterFeatured = [
    ...withImages.slice(featuredCount),
    ...withoutImages,
  ];
  layout.standard = afterFeatured.slice(0, standardCount);

  // Compact: everything else
  layout.compact = afterFeatured.slice(standardCount);

  return layout;
}

// Discovery score - inverts normal ranking to find serendipitous content
function calculateDiscoveryScore(
  article: Article,
  profile: UserProfile
): { score: number; context: string } {
  let score = 50; // Start at baseline
  let context = "";

  // Get user's top sections (most read)
  const sectionEntries = Object.entries(profile.sections).sort((a, b) => b[1] - a[1]);
  const topSections = sectionEntries.slice(0, 3).map(([section]) => section);
  const userSections = new Set(sectionEntries.map(([section]) => section));

  // PENALTY for familiar sections
  if (topSections.includes(article.section)) {
    score -= 30;
    context = `You usually read ${topSections[0]}`;
  } else if (userSections.has(article.section)) {
    score -= 10;
    context = `You sometimes read ${article.section}`;
  } else {
    // BONUS for completely new sections
    score += 25;
    context = `You usually read ${topSections[0]}. Here's something from ${article.section}.`;
  }

  // PENALTY for familiar topics
  let topicFamiliarity = 0;
  article.keywords.forEach((keyword) => {
    if (profile.topics[keyword]) {
      topicFamiliarity += profile.topics[keyword];
    }
  });
  const maxTopicScore = Math.max(...Object.values(profile.topics), 1);
  const topicPenalty = Math.min((topicFamiliarity / maxTopicScore) * 15, 15);
  score -= topicPenalty;

  // PENALTY for familiar reporters
  const bylineWords = article.byline.toLowerCase();
  Object.keys(profile.reporters).forEach((reporter) => {
    if (bylineWords.includes(reporter.toLowerCase())) {
      score -= 10;
    }
  });

  // Keep some recency boost for freshness
  const recencyBoost = calculateRecencyBoost(article) * 0.5;
  score += recencyBoost;

  // Higher serendipity randomness for more variety
  const hash = hashToNumber(article.uri);
  if (hash < 0.5) {
    score += hash * 20;
  }

  // Prefer articles with images for better visual experience
  if (article.imageUrl) {
    score += 5;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    context: context || `From ${article.section}`,
  };
}

// Rank articles for Discovery feed (high serendipity, outside user patterns)
export function rankForDiscovery(
  articles: Article[],
  profile: UserProfile | null,
  readArticleUris: Set<string> = new Set()
): Array<Article & { relevanceScore: number; discoveryContext: string }> {
  // If no profile, just shuffle and return
  if (!profile) {
    const shuffled = [...articles]
      .filter((a) => !readArticleUris.has(a.uri))
      .sort(() => hashToNumber(articles[0]?.uri || "seed") - 0.5);
    return shuffled.slice(0, 30).map((a) => ({
      ...a,
      relevanceScore: 50,
      discoveryContext: `From ${a.section}`,
    }));
  }

  // Get user's top sections to exclude/deprioritize
  const sectionEntries = Object.entries(profile.sections).sort((a, b) => b[1] - a[1]);
  const topSections = new Set(sectionEntries.slice(0, 2).map(([section]) => section));

  // Score and filter articles
  const scored = articles
    .filter((a) => !readArticleUris.has(a.uri))
    .map((article) => {
      const { score, context } = calculateDiscoveryScore(article, profile);
      return {
        ...article,
        relevanceScore: Math.round(score),
        discoveryContext: context,
      };
    });

  // Sort by discovery score (highest first)
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Return top 30 for discovery feed
  return scored.slice(0, 30);
}

// Get ranking explanation for debugging/transparency
export function explainRanking(article: ScoredArticle): string {
  const factors = article.rankingFactors;
  const parts: string[] = [];

  if (factors.baseScore > 0) parts.push(`Profile match: +${factors.baseScore.toFixed(0)}`);
  if (factors.recencyBoost > 0) parts.push(`Fresh: +${factors.recencyBoost.toFixed(0)}`);
  if (factors.journalistBoost > 0) parts.push(`Followed journalist: +${factors.journalistBoost.toFixed(0)}`);
  if (factors.embeddingBoost > 0) parts.push(`Similar to liked: +${factors.embeddingBoost.toFixed(0)}`);
  if (factors.engagementBoost > 0) parts.push(`Engagement pattern: +${factors.engagementBoost.toFixed(0)}`);
  if (factors.engagementBoost < 0) parts.push(`Low conversion: ${factors.engagementBoost.toFixed(0)}`);
  if (factors.fatigueAdjustment < 0) parts.push(`Topic fatigue: ${factors.fatigueAdjustment.toFixed(0)}`);
  if (factors.negativeAdjustment < 0) parts.push(`Avoided topics: ${factors.negativeAdjustment.toFixed(0)}`);
  if (factors.serendipityBoost > 0) parts.push(`Discovery: +${factors.serendipityBoost.toFixed(0)}`);

  return parts.join(" | ") || "Base ranking";
}
