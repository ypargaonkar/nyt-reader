import type { NYTArticle, Article, FeedSection, ContentType } from "./types";

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

// Check if title indicates a live blog (by pattern, not just the field)
export function isLiveBlogByTitle(title: string): boolean {
  const normalized = title.replace(/[\u2018\u2019]/g, "'").toLowerCase();
  return (
    normalized.includes("here's the latest") ||
    normalized.includes("heres the latest") ||
    normalized.includes("what we know") ||
    normalized.includes("what to know") ||
    normalized.includes("live update")
  );
}

// Check if an article is an old live blog (older than 12 hours)
export function isOldLiveBlog(article: Article): boolean {
  // Check both the field AND the title pattern (for cached articles without the field)
  const isLive = article.isLiveBlog || isLiveBlogByTitle(article.title);
  if (!isLive) return false;

  const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
  const articleTime = new Date(article.updatedDate || article.publishedDate).getTime();
  return articleTime < twelveHoursAgo;
}

/**
 * Ensure an Article has a contentType field.
 * Used to backfill cached articles that were stored before this field existed.
 */
export function ensureContentType(article: Article): Article {
  if (article.contentType) return article;

  const lowerUrl = (article.url || "").toLowerCase();
  const lowerSection = (article.section || "").toLowerCase();
  const lowerMaterial = (article.materialType || "").toLowerCase();
  const lowerTitle = (article.title || "").toLowerCase();
  const lowerKeywords = (article.keywords || []).map((k) => k.toLowerCase());

  let contentType: ContentType = "text";

  if (
    lowerUrl.includes("/video/") ||
    lowerUrl.includes("/videos/") ||
    lowerMaterial.includes("video") ||
    lowerSection === "video"
  ) {
    contentType = "video";
  } else if (
    lowerUrl.includes("/podcasts/") ||
    lowerUrl.includes("/podcast/") ||
    lowerSection === "podcasts" ||
    lowerSection === "podcast" ||
    lowerMaterial.includes("podcast") ||
    lowerMaterial.includes("audio") ||
    lowerKeywords.some((k) => k.includes("podcast")) ||
    lowerTitle.includes("podcast")
  ) {
    contentType = (article.wordCount && article.wordCount > 500) ? "audio-transcript" : "audio";
  }

  return { ...article, contentType };
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
  // Normalize curly quotes to straight quotes for matching
  const normalizedTitle = title.replace(/[\u2018\u2019]/g, "'").toLowerCase();
  const lowerMaterial = materialType.toLowerCase();
  const isLiveBlog =
    normalizedTitle.includes("live update") ||
    normalizedTitle.includes("here's the latest") ||
    normalizedTitle.includes("here's what") ||
    normalizedTitle.includes("heres the latest") || // without apostrophe
    normalizedTitle.includes("what we know") ||
    normalizedTitle.includes("what to know") ||
    lowerMaterial.includes("briefing") ||
    lowerMaterial.includes("live") ||
    raw.item_type?.toLowerCase() === "liveblog";

  // Detect content type (video, audio/podcast, or text)
  const articleUrl = raw.url || raw.web_url || "";
  const lowerUrl = articleUrl.toLowerCase();
  const lowerSection = (raw.section || raw.section_name || "").toLowerCase();
  const lowerItemType = (raw.item_type || raw.type || "").toLowerCase();
  const lowerKeywords = keywords.map((k) => k.toLowerCase());

  let contentType: ContentType = "text";

  // Detect video
  if (
    lowerUrl.includes("/video/") ||
    lowerUrl.includes("/videos/") ||
    lowerItemType === "video" ||
    lowerMaterial.includes("video") ||
    lowerSection === "video" ||
    raw.document_type === "video"
  ) {
    contentType = "video";
  }
  // Detect audio/podcast
  else if (
    lowerUrl.includes("/podcasts/") ||
    lowerUrl.includes("/podcast/") ||
    lowerSection === "podcasts" ||
    lowerSection === "podcast" ||
    lowerMaterial.includes("podcast") ||
    lowerMaterial.includes("audio") ||
    lowerItemType === "audio" ||
    lowerKeywords.some((k) => k.includes("podcast")) ||
    normalizedTitle.includes("podcast")
  ) {
    // If it has substantial word count, it likely includes a transcript
    contentType = (raw.word_count && raw.word_count > 500) ? "audio-transcript" : "audio";
  }

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
    contentType,
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

// Sections to exclude from the feed
const EXCLUDED_SECTIONS = new Set([
  "gameplay",
  "games",
]);

// ─── Times Wire RSS Feed (replaced Times Newswire API, decommissioned 5/21/2026) ───

const NYT_RSS_BASE = "https://rss.nytimes.com/services/xml/rss/nyt";

// Each entry maps an RSS filename to the app section name used in SECTION_FILTERS.
// HomePage articles derive their section from the article URL instead.
const RSS_FEED_SECTIONS = [
  { feed: "HomePage",  section: "" },       // section derived from URL
  { feed: "World",     section: "world" },
  { feed: "US",        section: "us" },
  { feed: "Politics",  section: "politics" },
  { feed: "Technology",section: "technology" },
  { feed: "Science",   section: "science" },
  { feed: "Climate",   section: "climate" },
  { feed: "Business",  section: "business" },
  { feed: "Arts",      section: "arts" },
  { feed: "Sports",    section: "sports" },
  { feed: "Health",    section: "health" },
  { feed: "Opinion",   section: "opinion" },
] as const;

// Extract the top-level section from a NYT article URL:
// https://www.nytimes.com/2026/05/21/world/europe/... → "world"
function sectionFromNYTUrl(url: string): string {
  const m = url.match(/nytimes\.com\/\d{4}\/\d{2}\/\d{2}\/([^/?#]+)/);
  return m ? m[1].toLowerCase() : "";
}

// Extract text content of an XML tag, unwrapping CDATA and decoding entities.
function xmlText(xml: string, tag: string): string {
  const t = tag.replace(/:/g, "\\:");
  const re = new RegExp(
    `<${t}(?:[^>]*)>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*<\\/${t}>`,
    "i"
  );
  const m = xml.match(re);
  if (!m) return "";
  return m[1]
    .trim()
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

// Parse one RSS <item> block into an Article.
function parseRSSItem(itemXml: string, feedSection: string): Article | null {
  const title = xmlText(itemXml, "title");
  const link  = xmlText(itemXml, "link") || xmlText(itemXml, "guid");
  if (!title || !link) return null;

  const section  = sectionFromNYTUrl(link) || feedSection;
  const abstract = xmlText(itemXml, "description");
  const pubStr   = xmlText(itemXml, "pubDate");
  const creator  = xmlText(itemXml, "dc:creator");

  // Pick the largest image across all media:content elements.
  let imageUrl: string | null = null;
  let imageCaption: string | null = null;
  let maxPixels = 0;

  const mediaRe = /<media:content([^>]*?)(?:\/>|>([\s\S]*?)<\/media:content>)/gi;
  let mm;
  while ((mm = mediaRe.exec(itemXml)) !== null) {
    const attrs = mm[1];
    const inner = mm[2] || "";
    const url   = (attrs.match(/url="([^"]*)"/) || [])[1] || "";
    const w     = parseInt((attrs.match(/width="(\d+)"/)  || [])[1] || "0", 10);
    const h     = parseInt((attrs.match(/height="(\d+)"/) || [])[1] || "0", 10);
    if (url && w * h > maxPixels) {
      maxPixels    = w * h;
      imageUrl     = getHighResImageUrl(url);
      imageCaption = xmlText(inner, "media:description") || null;
    }
  }

  // Collect facets from <category domain="..."> elements.
  const keywords: string[]      = [];
  const people: string[]        = [];
  const organizations: string[] = [];
  const locations: string[]     = [];

  const catRe = /<category[^>]*domain="([^"]*)"[^>]*>(?:<!\[CDATA\[)?([^<]*?)(?:\]\]>)?<\/category>/gi;
  let cm;
  while ((cm = catRe.exec(itemXml)) !== null) {
    const domain = cm[1];
    const value  = cm[2].trim();
    if (!value) continue;
    if (domain.includes("keywords/des"))                                   keywords.push(value);
    else if (domain.includes("nyt_per") || domain.includes("per_facet")) people.push(value);
    else if (domain.includes("nyt_org") || domain.includes("org_facet")) organizations.push(value);
    else if (domain.includes("nyt_geo") || domain.includes("geo_facet")) locations.push(value);
  }

  // Live-blog detection (reuse same patterns as normalizeArticle).
  const norm = title.replace(/[‘’]/g, "'").toLowerCase();
  const isLiveBlog =
    norm.includes("live update") ||
    norm.includes("here's the latest") ||
    norm.includes("heres the latest") ||
    norm.includes("what we know") ||
    norm.includes("what to know");

  // Content-type detection from URL.
  const lowerLink = link.toLowerCase();
  let contentType: ContentType = "text";
  if (lowerLink.includes("/video/") || lowerLink.includes("/videos/")) {
    contentType = "video";
  } else if (lowerLink.includes("/podcast/") || lowerLink.includes("/podcasts/")) {
    contentType = "audio";
  }

  const publishedDate = pubStr ? new Date(pubStr).toISOString() : new Date().toISOString();

  return {
    uri: link,
    url: link,
    title,
    abstract,
    section,
    subsection: "",
    byline: creator ? `By ${creator}` : "",
    publishedDate,
    updatedDate: publishedDate,
    imageUrl,
    imageCaption,
    keywords,
    people,
    organizations,
    locations,
    materialType: "Article",
    wordCount: 0,
    hasMultimedia: !!imageUrl,
    isInteractive: false,
    isLiveBlog,
    contentType,
    desk: "",
    source: "The New York Times",
  };
}

// Fetch and parse a single NYT RSS feed section.
async function fetchRSSSection(feed: string, section: string): Promise<Article[]> {
  const response = await fetch(`${NYT_RSS_BASE}/${feed}.xml`);
  if (!response.ok) throw new Error(`RSS ${feed}: ${response.status}`);

  const xml      = await response.text();
  const articles: Article[] = [];
  const itemRe   = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const article = parseRSSItem(m[1], section);
    if (article) articles.push(article);
  }
  return articles;
}

/**
 * MASTER FETCH — fetches all RSS sections in parallel (no API quota used).
 * apiKey is accepted but unused; RSS feeds are public.
 */
export async function fetchAllArticles(_apiKey: string): Promise<Article[]> {
  const results = await Promise.allSettled(
    RSS_FEED_SECTIONS.map(({ feed, section }) => fetchRSSSection(feed, section))
  );

  const articleMap = new Map<string, Article>();
  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const article of result.value) {
        const sectionLower = article.section.toLowerCase();
        if (!articleMap.has(article.uri) && !EXCLUDED_SECTIONS.has(sectionLower)) {
          articleMap.set(article.uri, article);
        }
      }
    }
  }
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
 * Fetch all RSS sections in parallel and return deduplicated articles.
 * apiKey is accepted for interface compatibility but RSS feeds are public.
 */
export async function fetchComprehensiveFeed(_apiKey: string): Promise<Article[]> {
  const results = await Promise.allSettled(
    RSS_FEED_SECTIONS.map(({ feed, section }) => fetchRSSSection(feed, section))
  );

  const articleMap = new Map<string, Article>();
  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const article of result.value) {
        const sectionLower = article.section.toLowerCase();
        if (!isOldLiveBlog(article) && !EXCLUDED_SECTIONS.has(sectionLower)) {
          if (!articleMap.has(article.uri)) {
            articleMap.set(article.uri, article);
          }
        }
      }
    }
  }
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
