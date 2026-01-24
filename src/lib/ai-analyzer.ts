import OpenAI from "openai";
import type { Article, UserProfile } from "./types";

interface AnalysisResult {
  insights: string;
  profileUpdates: {
    sections: Record<string, number>;
    topics: Record<string, number>;
    reporters: Record<string, number>;
    organizations: Record<string, number>;
    locations: Record<string, number>;
    materialTypes: Record<string, number>;
    preferredWordCountRange: { min: number; max: number };
    multimediaPreference: number; // 0-1
    interactivePreference: number; // 0-1
  };
}

export async function analyzeReadingPreferences(
  likedArticles: Article[],
  currentProfile: UserProfile | null,
  openaiApiKey: string
): Promise<AnalysisResult> {
  const openai = new OpenAI({ apiKey: openaiApiKey });

  // Prepare article summaries for analysis
  const articleSummaries = likedArticles.map((article) => ({
    title: article.title,
    section: article.section,
    subsection: article.subsection,
    byline: article.byline,
    keywords: article.keywords.slice(0, 5),
    people: article.people.slice(0, 3),
    organizations: article.organizations.slice(0, 3),
    locations: article.locations.slice(0, 3),
    materialType: article.materialType,
    wordCount: article.wordCount,
    hasMultimedia: article.hasMultimedia,
    isInteractive: article.isInteractive,
    desk: article.desk,
  }));

  const currentProfileSummary = currentProfile
    ? `
Current profile:
- Top sections: ${Object.entries(currentProfile.sections)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([k, v]) => `${k} (${v})`)
        .join(", ")}
- Top reporters: ${Object.entries(currentProfile.reporters)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([k, v]) => `${k} (${v})`)
        .join(", ")}
- Top topics: ${Object.entries(currentProfile.topics)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([k, v]) => `${k} (${v})`)
        .join(", ")}
- Total likes: ${currentProfile.totalLikes}
`
    : "This is the first analysis - no existing profile.";

  const prompt = `You are analyzing a user's reading preferences based on articles they've liked from the New York Times.

${currentProfileSummary}

New liked articles to analyze (${articleSummaries.length} articles):
${JSON.stringify(articleSummaries, null, 2)}

Based on these liked articles, provide:

1. A brief, insightful summary (2-3 sentences) of their reading preferences, patterns, and any interesting observations. Be specific about topics, not generic. Mention if they seem to follow specific reporters or have geographic interests.

2. Quantified preference updates as a JSON object. For each category, assign scores based on how strongly each value appears in their likes (higher = stronger preference, scale of 0-10 for new items, or increments of 1-3 for updating existing scores).

Respond ONLY with valid JSON in this exact format:
{
  "insights": "Your 2-3 sentence analysis here...",
  "profileUpdates": {
    "sections": {"Politics": 5, "Science": 3, ...},
    "topics": {"Climate Change": 4, "Elections": 3, ...},
    "reporters": {"David Leonhardt": 2, ...},
    "organizations": {"Congress": 2, ...},
    "locations": {"Washington DC": 3, ...},
    "materialTypes": {"News Analysis": 4, "Opinion": 2, ...},
    "preferredWordCountRange": {"min": 800, "max": 2000},
    "multimediaPreference": 0.7,
    "interactivePreference": 0.3
  }
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content:
          "You are an expert at analyzing reading behavior and preferences. Respond only with valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 1000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  try {
    const result = JSON.parse(content) as AnalysisResult;
    return result;
  } catch {
    throw new Error("Failed to parse OpenAI response as JSON");
  }
}

export async function generateRecommendationQuery(
  profile: UserProfile,
  openaiApiKey: string
): Promise<string> {
  const openai = new OpenAI({ apiKey: openaiApiKey });

  const topTopics = Object.entries(profile.topics)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([k]) => k);

  const topSections = Object.entries(profile.sections)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([k]) => k);

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content:
          "You generate NYT article search queries. Respond with ONLY the search query, no explanation.",
      },
      {
        role: "user",
        content: `Generate a search query for the NYT Article Search API to find articles matching these preferences:

Topics of interest: ${topTopics.join(", ")}
Preferred sections: ${topSections.join(", ")}
${profile.aiInsights ? `Recent insight: ${profile.aiInsights}` : ""}

Return a single search query (2-4 words) that would find relevant articles. Just the query, nothing else.`,
      },
    ],
    temperature: 0.8,
    max_tokens: 50,
  });

  return response.choices[0]?.message?.content?.trim() || "";
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

// Calculate relevance score for an article based on profile
export function calculateRelevanceScore(
  article: Article,
  profile: UserProfile,
  followedJournalists?: Set<string>
): number {
  let score = 0;

  // Check if article is from a followed journalist (major boost: +25)
  if (followedJournalists && followedJournalists.size > 0) {
    const articleAuthors = parseBylineNames(article.byline);
    const isFromFollowed = articleAuthors.some((author) => {
      for (const followed of followedJournalists) {
        if (author.includes(followed.toLowerCase()) ||
            followed.toLowerCase().includes(author)) {
          return true;
        }
      }
      return false;
    });
    if (isFromFollowed) {
      score += 25; // Significant boost for followed journalists
    }
  }

  // Section match (weight: 25%)
  const sectionScore = profile.sections[article.section] || 0;
  const maxSectionScore = Math.max(...Object.values(profile.sections), 1);
  score += (sectionScore / maxSectionScore) * 25;

  // Topic/keyword match (weight: 20%)
  let topicScore = 0;
  article.keywords.forEach((keyword) => {
    topicScore += profile.topics[keyword] || 0;
  });
  const maxTopicScore = Math.max(...Object.values(profile.topics), 1);
  score += Math.min((topicScore / maxTopicScore) * 20, 20);

  // Reporter match from likes (weight: 15%)
  const bylineWords = article.byline.toLowerCase();
  let reporterScore = 0;
  Object.entries(profile.reporters).forEach(([reporter, weight]) => {
    if (bylineWords.includes(reporter.toLowerCase())) {
      reporterScore = Math.max(reporterScore, weight);
    }
  });
  const maxReporterScore = Math.max(...Object.values(profile.reporters), 1);
  score += (reporterScore / maxReporterScore) * 15;

  // Material type match (weight: 5%)
  const materialScore = profile.materialTypes[article.materialType] || 0;
  const maxMaterialScore = Math.max(...Object.values(profile.materialTypes), 1);
  score += (materialScore / maxMaterialScore) * 5;

  // Multimedia preference (weight: 3%)
  if (article.hasMultimedia && profile.prefersMultimedia > 0.5) {
    score += 3 * profile.prefersMultimedia;
  }

  // Interactive preference (weight: 3%)
  if (article.isInteractive && profile.prefersInteractive > 0.5) {
    score += 3 * profile.prefersInteractive;
  }

  // Location/organization match (weight: 4%)
  let geoOrgScore = 0;
  article.locations.forEach((loc) => {
    geoOrgScore += profile.locations[loc] || 0;
  });
  article.organizations.forEach((org) => {
    geoOrgScore += profile.organizations[org] || 0;
  });
  if (geoOrgScore > 0) {
    score += Math.min(geoOrgScore, 4);
  }

  // Normalize to 0-100
  return Math.round(Math.min(score, 100));
}

// Build user profile from database entries
export function buildProfileFromEntries(
  entries: Array<{ category: string; value: string; score: number }>,
  aiInsights: string | null,
  totalLikes: number
): UserProfile {
  const profile: UserProfile = {
    sections: {},
    reporters: {},
    topics: {},
    organizations: {},
    locations: {},
    materialTypes: {},
    preferredWordCount: { min: 500, max: 2000 },
    prefersMultimedia: 0.5,
    prefersInteractive: 0.5,
    totalLikes,
    lastAnalyzed: null,
    aiInsights,
  };

  entries.forEach((entry) => {
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
      case "materialType":
        profile.materialTypes[entry.value] = entry.score;
        break;
      case "prefersMultimedia":
        profile.prefersMultimedia = entry.score;
        break;
      case "prefersInteractive":
        profile.prefersInteractive = entry.score;
        break;
    }
  });

  return profile;
}
