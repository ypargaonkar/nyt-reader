import type { NYTArticle, Article, FeedSection } from "./types";

const NYT_API_BASE = "https://api.nytimes.com/svc";

// Rate limiting configuration
const DAILY_LIMIT = 500;
const MINUTE_LIMIT = 5;
const MIN_INTERVAL_MS = 12000; // 12 seconds between calls to stay under 5/min

// In-memory rate limiting (server-side)
let lastCallTime = 0;
let callsThisMinute = 0;
let minuteStartTime = Date.now();

// Section keywords for filtering
const SECTION_FILTERS: Record<FeedSection, (article: Article) => boolean> = {
  "for-you": () => true, // Will be sorted by relevance score
  discover: () => true, // Will be sorted by inverse relevance (serendipity)
  saved: () => true, // Handled separately in Feed.tsx
  stories: () => true, // Handled separately in Feed.tsx
  history: () => true, // Handled separately in Feed.tsx
  politics: (a) =>
    a.section.toLowerCase() === "politics" ||
    a.section.toLowerCase() === "us politics" ||
    a.subsection?.toLowerCase() === "politics" ||
    a.desk.toLowerCase().includes("politic") ||
    a.keywords.some((k) => k.toLowerCase().includes("politic")),
  world: (a) =>
    a.section.toLowerCase() === "world" ||
    a.desk.toLowerCase() === "foreign",
  us: (a) =>
    a.section.toLowerCase() === "u.s." ||
    a.section.toLowerCase() === "us" ||
    a.desk.toLowerCase() === "national",
  opinion: (a) =>
    a.section.toLowerCase() === "opinion" ||
    a.materialType.toLowerCase().includes("op-ed") ||
    a.materialType.toLowerCase().includes("editorial"),
  science: (a) =>
    a.section.toLowerCase() === "science" ||
    a.desk.toLowerCase() === "science",
  technology: (a) =>
    a.section.toLowerCase() === "technology" ||
    a.section.toLowerCase() === "tech" ||
    a.desk.toLowerCase() === "technology",
  climate: (a) =>
    a.section.toLowerCase().includes("climate") ||
    a.desk.toLowerCase().includes("climate") ||
    a.keywords.some((k) => k.toLowerCase().includes("climate")) ||
    a.keywords.some((k) => k.toLowerCase().includes("global warming")) ||
    a.keywords.some((k) => k.toLowerCase().includes("greenhouse")),
  graphics: (a) => {
    const graphicsKeywords = [
      "graphic", "interactive", "visualization", "chart", "map", "data",
      "infographic", "tracker", "calculator", "quiz", "timeline", "diagram",
      "multimedia", "visual"
    ];
    const lowerMaterial = a.materialType.toLowerCase();
    const lowerDesk = a.desk.toLowerCase();
    const lowerTitle = a.title.toLowerCase();
    const lowerSection = a.section.toLowerCase();

    return (
      a.isInteractive ||
      lowerMaterial.includes("interactive") ||
      lowerMaterial.includes("graphic") ||
      lowerDesk.includes("graphic") ||
      lowerSection.includes("interactive") ||
      graphicsKeywords.some((k) => lowerTitle.includes(k)) ||
      a.keywords.some((kw) =>
        graphicsKeywords.some((gk) => kw.toLowerCase().includes(gk))
      )
    );
  },
  investigative: (a) => {
    const investigativeKeywords = [
      "investigation", "investigative", "expose", "exposé", "uncovered",
      "revealed", "exclusive", "in-depth", "deep dive", "accountability",
      "corruption", "scandal", "whistleblower", "documents show",
      "records reveal", "obtained by", "examination", "inquiry"
    ];
    const lowerMaterial = a.materialType.toLowerCase();
    const lowerDesk = a.desk.toLowerCase();
    const lowerTitle = a.title.toLowerCase();
    const lowerAbstract = a.abstract.toLowerCase();
    const lowerSection = a.section.toLowerCase();

    return (
      lowerDesk.includes("investigat") ||
      lowerSection.includes("investigat") ||
      lowerMaterial.includes("investigat") ||
      lowerMaterial.includes("news analysis") ||
      investigativeKeywords.some((k) => lowerTitle.includes(k)) ||
      investigativeKeywords.some((k) => lowerAbstract.includes(k)) ||
      a.keywords.some((kw) =>
        investigativeKeywords.some((ik) => kw.toLowerCase().includes(ik))
      ) ||
      // Long-form articles (2000+ words) are often investigative
      (a.wordCount >= 2000 && (
        lowerMaterial.includes("news") ||
        lowerDesk.includes("national") ||
        lowerDesk.includes("foreign")
      ))
    );
  },
  business: (a) =>
    a.section.toLowerCase() === "business" ||
    a.desk.toLowerCase().includes("business"),
  arts: (a) =>
    a.section.toLowerCase() === "arts" ||
    a.section.toLowerCase() === "art" ||
    a.desk.toLowerCase().includes("culture"),
  books: (a) =>
    a.section.toLowerCase() === "books" ||
    a.section.toLowerCase().includes("book") ||
    a.desk.toLowerCase().includes("book"),
  magazine: (a) =>
    a.section.toLowerCase() === "magazine" ||
    a.desk.toLowerCase() === "magazine",
  sports: (a) =>
    a.section.toLowerCase() === "sports" ||
    a.desk.toLowerCase().includes("sports"),
  health: (a) =>
    a.section.toLowerCase() === "health" ||
    a.section.toLowerCase() === "well" ||
    a.desk.toLowerCase().includes("health"),
  food: (a) =>
    a.section.toLowerCase() === "food" ||
    a.section.toLowerCase() === "dining" ||
    a.desk.toLowerCase().includes("food"),
  travel: (a) =>
    a.section.toLowerCase() === "travel" ||
    a.desk.toLowerCase().includes("travel"),
  realestate: (a) =>
    a.section.toLowerCase() === "realestate" ||
    a.section.toLowerCase() === "real estate" ||
    a.desk.toLowerCase().includes("real estate"),
  fashion: (a) =>
    a.section.toLowerCase() === "fashion" ||
    a.section.toLowerCase() === "style" ||
    a.section.toLowerCase() === "t magazine" ||
    a.desk.toLowerCase().includes("fashion") ||
    a.desk.toLowerCase().includes("style"),
  movies: (a) =>
    a.section.toLowerCase() === "movies" ||
    a.subsection?.toLowerCase() === "movies" ||
    a.desk.toLowerCase().includes("movie") ||
    a.keywords.some((k) => k.toLowerCase() === "movies"),
  theater: (a) =>
    a.section.toLowerCase() === "theater" ||
    a.subsection?.toLowerCase() === "theater" ||
    a.desk.toLowerCase().includes("theater") ||
    a.keywords.some((k) => k.toLowerCase() === "theater"),
  nyregion: (a) =>
    a.section.toLowerCase() === "nyregion" ||
    a.section.toLowerCase() === "new york" ||
    a.section.toLowerCase() === "ny" ||
    a.desk.toLowerCase().includes("metro"),
};

// Attempt to get a higher resolution version of an NYT image URL
// NYT image URLs have size suffixes that can be swapped
function getHighResImageUrl(url: string): string {
  if (!url) return url;

  // Common size suffixes in NYT image URLs (smallest to largest)
  const sizeSuffixes = [
    "thumbStandard",
    "thumbLarge",
    "mediumThreeByTwo210",
    "mediumThreeByTwo440",
    "articleInline",
    "articleLarge",
    "popup",
    "superJumbo",
    "jumbo",
  ];

  // Try to replace any known size suffix with superJumbo (largest)
  for (const suffix of sizeSuffixes) {
    if (url.includes(`-${suffix}.`) || url.includes(`-${suffix}-`)) {
      return url.replace(`-${suffix}`, "-superJumbo");
    }
    // Also check without hyphen prefix
    if (url.includes(`/${suffix}.`) || url.includes(`${suffix}.jpg`) || url.includes(`${suffix}.png`)) {
      return url.replace(suffix, "superJumbo");
    }
  }

  // For URLs with format in path like /images/.../NAME-FORMAT.jpg
  // Try to extract and replace
  const formatMatch = url.match(/(-)(thumbStandard|thumbLarge|mediumThreeByTwo\d+|articleInline|articleLarge|popup|jumbo|superJumbo|small|medium|large|xlarge)(\.(jpg|jpeg|png|webp))/i);
  if (formatMatch) {
    return url.replace(formatMatch[0], `-superJumbo${formatMatch[3]}`);
  }

  return url;
}

// Check if an article is in English
export function isEnglishArticle(raw: NYTArticle): boolean {
  const url = raw.url || raw.web_url || "";
  const title = raw.title || raw.headline?.main || "";
  const abstract = raw.abstract || raw.snippet || "";

  // Check for Spanish NYT URLs
  if (url.includes("es.nytimes.com") || url.includes("/es/")) {
    return false;
  }

  // Common Spanish patterns in titles
  const spanishPatterns = [
    /\b(el|la|los|las|un|una|del|al|que|por|para|con|sin|sobre|entre|desde|hasta)\b/gi,
    /[áéíóúüñ¿¡]/i,
  ];

  // Check if title has multiple Spanish indicators
  const text = `${title} ${abstract}`;
  let spanishIndicators = 0;

  for (const pattern of spanishPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 2) {
      spanishIndicators++;
    }
  }

  // If multiple Spanish patterns found, likely not English
  if (spanishIndicators >= 2) {
    return false;
  }

  return true;
}

// Normalize NYT API response to our Article format
export function normalizeArticle(raw: NYTArticle): Article {
  // Extract byline
  let byline = "";
  if (typeof raw.byline === "string") {
    byline = raw.byline;
  } else if (raw.byline?.original) {
    byline = raw.byline.original;
  }

  // Extract title
  const title = raw.title || raw.headline?.main || "";

  // Extract abstract/snippet
  const abstract = raw.abstract || raw.snippet || "";

  // Extract image URL - prefer highest quality
  let imageUrl: string | null = null;
  let imageCaption: string | null = null;

  if (raw.multimedia && Array.isArray(raw.multimedia) && raw.multimedia.length > 0) {
    // Priority order for image formats (highest quality first)
    // NYT API uses both spaced ("Super Jumbo") and camelCase formats
    const formatPriority = [
      "Super Jumbo",
      "superJumbo",
      "Jumbo",
      "jumbo",
      "Super Large",
      "superLarge",
      "Large",
      "large",
      "xlarge",
      "threeByTwoMediumAt2X",  // 1200px wide
      "mediumThreeByTwo440",
      "popup",
      "mediumThreeByTwo210",
      "articleLarge",
      "articleInline",
      "thumbLarge",
    ];

    // First, try to find best image by dimensions (most reliable)
    let bestImage: typeof raw.multimedia[0] | null = null;
    let maxPixels = 0;

    for (const mm of raw.multimedia) {
      if ("url" in mm && "width" in mm && "height" in mm) {
        const pixels = (mm.width || 0) * (mm.height || 0);
        if (pixels > maxPixels) {
          maxPixels = pixels;
          bestImage = mm;
        }
      }
    }

    // If no dimensions, fall back to format name matching
    if (!bestImage || maxPixels < 200000) { // Less than ~450x450
      let bestPriority = formatPriority.length;
      for (const mm of raw.multimedia) {
        if ("url" in mm && "format" in mm) {
          const format = mm.format as string;
          const priority = formatPriority.indexOf(format);
          if (priority !== -1 && priority < bestPriority) {
            bestPriority = priority;
            bestImage = mm;
          }
        }
      }
    }

    // Last resort: use first image with a URL
    if (!bestImage) {
      bestImage = raw.multimedia.find(mm => "url" in mm) || raw.multimedia[0];
    }

    if (bestImage && "url" in bestImage) {
      const rawUrl = bestImage.url.startsWith("http")
        ? bestImage.url
        : `https://static01.nyt.com/${bestImage.url}`;
      // Try to get a higher resolution version
      imageUrl = getHighResImageUrl(rawUrl);
      imageCaption = bestImage.caption || null;
    }
  } else if (raw.media && Array.isArray(raw.media) && raw.media.length > 0) {
    const media = raw.media[0];
    if (media["media-metadata"] && media["media-metadata"].length > 0) {
      // media-metadata is sorted by size, last is largest
      const largest = media["media-metadata"][media["media-metadata"].length - 1];
      // Try to get a higher resolution version
      imageUrl = getHighResImageUrl(largest.url);
      imageCaption = media.caption || null;
    }
  }

  // Extract keywords/facets
  const keywords: string[] = raw.des_facet || [];
  const people: string[] = raw.per_facet || [];
  const organizations: string[] = Array.isArray(raw.org_facet)
    ? raw.org_facet
    : raw.org_facet
    ? [raw.org_facet]
    : [];
  const locations: string[] = raw.geo_facet || [];

  if (raw.keywords) {
    raw.keywords.forEach((kw) => {
      if (kw.name === "subject" && !keywords.includes(kw.value)) {
        keywords.push(kw.value);
      } else if (kw.name === "persons" && !people.includes(kw.value)) {
        people.push(kw.value);
      } else if (kw.name === "organizations" && !organizations.includes(kw.value)) {
        organizations.push(kw.value);
      } else if (kw.name === "glocations" && !locations.includes(kw.value)) {
        locations.push(kw.value);
      }
    });
  }

  const materialType =
    raw.material_type_facet ||
    raw.type_of_material ||
    raw.item_type ||
    raw.type ||
    "Article";

  const isInteractive =
    materialType.toLowerCase().includes("interactive") ||
    raw.document_type === "multimedia";

  // Detect live blogs - these have continuously updating content
  const lowerTitle = title.toLowerCase();
  const lowerMaterial = materialType.toLowerCase();
  const isLiveBlog =
    lowerTitle.includes("live update") ||
    lowerTitle.includes("here's the latest") ||
    lowerTitle.includes("here's what") ||
    lowerTitle.includes("heres the latest") || // without apostrophe
    lowerTitle.includes("what we know") ||
    lowerTitle.includes("what to know") ||
    lowerTitle === "here's the latest." || // exact match with period
    lowerMaterial.includes("briefing") ||
    lowerMaterial.includes("live") ||
    raw.item_type?.toLowerCase() === "liveblog";

  const publishedDate =
    raw.published_date || raw.pub_date || new Date().toISOString();
  const updatedDate =
    raw.updated_date || raw.created_date || publishedDate;

  return {
    uri: raw.uri || raw.url,
    url: raw.url || raw.web_url || "",
    title,
    abstract,
    section: raw.section || raw.section_name || "",
    subsection: raw.subsection || "",
    byline,
    publishedDate,
    updatedDate,
    imageUrl,
    imageCaption,
    keywords,
    people,
    organizations,
    locations,
    materialType,
    wordCount: raw.word_count || 0,
    hasMultimedia: !!(
      (raw.multimedia && raw.multimedia.length > 0) ||
      (raw.media && raw.media.length > 0)
    ),
    isInteractive,
    isLiveBlog,
    desk: raw.desk || raw.news_desk || "",
    source: raw.source || "The New York Times",
  };
}

// Rate limiter
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();

  if (now - minuteStartTime > 60000) {
    callsThisMinute = 0;
    minuteStartTime = now;
  }

  if (callsThisMinute >= MINUTE_LIMIT) {
    const waitTime = 60000 - (now - minuteStartTime);
    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      callsThisMinute = 0;
      minuteStartTime = Date.now();
    }
  }

  const timeSinceLastCall = now - lastCallTime;
  if (timeSinceLastCall < MIN_INTERVAL_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_INTERVAL_MS - timeSinceLastCall)
    );
  }

  lastCallTime = Date.now();
  callsThisMinute++;
}

// Fetch wrapper with error handling
async function fetchNYT(
  endpoint: string,
  apiKey: string
): Promise<unknown> {
  await waitForRateLimit();

  const url = `${NYT_API_BASE}${endpoint}${
    endpoint.includes("?") ? "&" : "?"
  }api-key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please wait before making more requests.");
    }
    if (response.status === 401) {
      throw new Error("Invalid API key. Please check your NYT API key in settings.");
    }
    throw new Error(`NYT API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Times Wire API - fetches latest articles across all sections
export async function fetchTimesWire(
  source: "all" | "nyt" | "inyt" = "nyt",
  section: string = "all",
  limit: number = 20,
  apiKey: string
): Promise<Article[]> {
  const data = (await fetchNYT(
    `/news/v3/content/${source}/${section}.json?limit=${limit}`,
    apiKey
  )) as {
    results: NYTArticle[];
  };

  // Filter to English articles only
  const englishResults = (data.results || []).filter(isEnglishArticle);
  return englishResults.map(normalizeArticle);
}

// Top Stories API
export async function fetchTopStories(
  section: string,
  apiKey: string
): Promise<Article[]> {
  const data = (await fetchNYT(
    `/topstories/v2/${section}.json`,
    apiKey
  )) as {
    results: NYTArticle[];
  };

  // Filter to English articles only
  const englishResults = (data.results || []).filter(isEnglishArticle);
  return englishResults.map(normalizeArticle);
}

// Most Popular API
export async function fetchMostPopular(
  type: "emailed" | "shared" | "viewed",
  period: 1 | 7 | 30,
  apiKey: string
): Promise<Article[]> {
  const data = (await fetchNYT(
    `/mostpopular/v2/${type}/${period}.json`,
    apiKey
  )) as {
    results: NYTArticle[];
  };

  // Filter to English articles only
  const englishResults = (data.results || []).filter(isEnglishArticle);
  return englishResults.map(normalizeArticle);
}

/**
 * MASTER FETCH - Fetches ALL articles in one go
 * This is the main function to call - fetches everything and caches it
 * Returns ~200-300 articles from multiple sources
 */
export async function fetchAllArticles(apiKey: string): Promise<Article[]> {
  // Fetch from Times Wire (up to 500 recent articles) - 1 API call
  // This gets articles from ALL sections
  const wireArticles = await fetchTimesWire("nyt", "all", 500, apiKey);

  // Deduplicate by URI
  const articleMap = new Map<string, Article>();
  wireArticles.forEach((article) => {
    if (!articleMap.has(article.uri)) {
      articleMap.set(article.uri, article);
    }
  });

  return Array.from(articleMap.values());
}

/**
 * Filter cached articles by section
 * This runs client-side, no API calls needed
 */
export function filterArticlesBySection(
  articles: Article[],
  section: FeedSection
): Article[] {
  const filter = SECTION_FILTERS[section];
  if (!filter) return articles;

  return articles.filter(filter);
}

/**
 * Fetch with optional top stories for home page
 * Uses 2-3 API calls max but gets comprehensive coverage
 */
export async function fetchComprehensiveFeed(apiKey: string): Promise<Article[]> {
  // Parallel fetch: Times Wire (all recent) + Top Stories (editorial picks)
  const [wireArticles, topStories] = await Promise.all([
    fetchTimesWire("nyt", "all", 500, apiKey),
    fetchTopStories("home", apiKey),
  ]);

  // Deduplicate, preferring top stories (they have editorial priority)
  const articleMap = new Map<string, Article>();

  // Add top stories first (higher priority)
  topStories.forEach((article) => {
    articleMap.set(article.uri, article);
  });

  // Add wire articles (fills in the rest)
  wireArticles.forEach((article) => {
    if (!articleMap.has(article.uri)) {
      articleMap.set(article.uri, article);
    }
  });

  return Array.from(articleMap.values());
}

// Get rate limit status
export function getRateLimitStatus(): {
  callsThisMinute: number;
  minuteLimit: number;
  canMakeCall: boolean;
} {
  const now = Date.now();
  if (now - minuteStartTime > 60000) {
    return {
      callsThisMinute: 0,
      minuteLimit: MINUTE_LIMIT,
      canMakeCall: true,
    };
  }
  return {
    callsThisMinute,
    minuteLimit: MINUTE_LIMIT,
    canMakeCall: callsThisMinute < MINUTE_LIMIT,
  };
}
