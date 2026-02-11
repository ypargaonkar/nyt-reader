import { NextRequest, NextResponse } from "next/server";

// Demo endpoint that uses server-side API key for recruiters/visitors
export async function GET(request: NextRequest) {
  // Use server-side demo API key (set in Vercel environment variables)
  const demoApiKey = process.env.DEMO_NYT_API_KEY;

  if (!demoApiKey) {
    return NextResponse.json(
      { error: "Demo API key not configured" },
      { status: 500 }
    );
  }

  try {
    // Fetch from NYT Top Stories API - multiple sections for variety
    const sections = ["home", "technology", "politics", "business", "science"];
    const allArticles: any[] = [];

    for (const section of sections) {
      try {
        const response = await fetch(
          `https://api.nytimes.com/svc/topstories/v2/${section}.json?api-key=${demoApiKey}`,
          { next: { revalidate: 300 } } // Cache for 5 minutes
        );

        if (response.ok) {
          const data = await response.json();
          if (data.results) {
            allArticles.push(...data.results.slice(0, 10)); // Get top 10 from each section
          }
        }
      } catch (e) {
        console.error(`Failed to fetch ${section}:`, e);
      }
    }

    // Transform to our Article format
    const articles = allArticles.map((article: any) => ({
      uri: article.uri || `nyt://article/${Date.now()}-${Math.random()}`,
      url: article.url || "",
      title: article.title || "",
      abstract: article.abstract || "",
      section: article.section || "",
      subsection: article.subsection || "",
      byline: article.byline || "",
      publishedDate: article.published_date || new Date().toISOString(),
      updatedDate: article.updated_date || new Date().toISOString(),
      imageUrl: article.multimedia?.[0]?.url || null,
      imageCaption: article.multimedia?.[0]?.caption || null,
      keywords: article.des_facet || [],
      people: article.per_facet || [],
      organizations: article.org_facet || [],
      locations: article.geo_facet || [],
      materialType: article.item_type || "News",
      wordCount: Math.floor(Math.random() * 1500) + 500,
      hasMultimedia: !!(article.multimedia && article.multimedia.length > 0),
      isInteractive: false,
      isLiveBlog: false,
      desk: article.section || "",
      source: "The New York Times",
      relevanceScore: Math.floor(Math.random() * 30) + 70, // Random score 70-100
    }));

    // Remove duplicates by URI
    const uniqueArticles = Array.from(
      new Map(articles.map((a) => [a.uri, a])).values()
    );

    return NextResponse.json({
      articles: uniqueArticles,
      count: uniqueArticles.length,
    });
  } catch (error) {
    console.error("Demo articles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch demo articles" },
      { status: 500 }
    );
  }
}
