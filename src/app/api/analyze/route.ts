import { NextRequest, NextResponse } from "next/server";
import {
  getLikedArticles,
  getProfileEntries,
  updateProfileScore,
  saveAiInsights,
  getLatestAiInsights,
} from "@/lib/db";
import {
  getLikedArticlesCloud,
  getProfileEntriesCloud,
  updateProfileScoreCloud,
  saveAiInsightsCloud,
  getLatestAiInsightsCloud,
} from "@/lib/db-cloud";
import { isTursoConfigured } from "@/lib/turso";
import {
  analyzeReadingPreferences,
  buildProfileFromEntries,
} from "@/lib/ai-analyzer";

export async function POST(request: NextRequest) {
  const useCloud = isTursoConfigured();

  try {
    const { openaiApiKey } = (await request.json()) as {
      openaiApiKey: string;
    };

    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "OpenAI API key required" },
        { status: 401 }
      );
    }

    // Get liked articles for analysis
    const likedArticles = useCloud
      ? await getLikedArticlesCloud(20)
      : getLikedArticles(20); // Analyze last 20 liked articles

    if (likedArticles.length < 3) {
      return NextResponse.json(
        { error: "Need at least 3 liked articles to analyze preferences" },
        { status: 400 }
      );
    }

    // Get current profile
    const profileEntries = useCloud
      ? await getProfileEntriesCloud()
      : getProfileEntries();
    const latestInsights = useCloud
      ? await getLatestAiInsightsCloud()
      : getLatestAiInsights();
    const currentProfile = buildProfileFromEntries(
      profileEntries,
      latestInsights?.insights || null,
      likedArticles.length
    );

    // Run AI analysis
    const analysis = await analyzeReadingPreferences(
      likedArticles,
      currentProfile,
      openaiApiKey
    );

    // Update profile with AI recommendations
    const updates = analysis.profileUpdates;

    // Helper function for updating scores
    const updateScore = async (cat: string, val: string, score: number) => {
      if (useCloud) {
        await updateProfileScoreCloud(cat, val, score);
      } else {
        updateProfileScore(cat, val, score);
      }
    };

    // Update section scores
    for (const [section, score] of Object.entries(updates.sections)) {
      await updateScore("section", section, score);
    }

    // Update topic scores
    for (const [topic, score] of Object.entries(updates.topics)) {
      await updateScore("topic", topic, score);
    }

    // Update reporter scores
    for (const [reporter, score] of Object.entries(updates.reporters)) {
      await updateScore("reporter", reporter, score);
    }

    // Update organization scores
    for (const [org, score] of Object.entries(updates.organizations)) {
      await updateScore("organization", org, score);
    }

    // Update location scores
    for (const [loc, score] of Object.entries(updates.locations)) {
      await updateScore("location", loc, score);
    }

    // Update material type scores
    for (const [type, score] of Object.entries(updates.materialTypes)) {
      await updateScore("materialType", type, score);
    }

    // Update preferences
    if (updates.multimediaPreference !== undefined) {
      await updateScore("prefersMultimedia", "value", updates.multimediaPreference);
    }
    if (updates.interactivePreference !== undefined) {
      await updateScore("prefersInteractive", "value", updates.interactivePreference);
    }

    // Save insights
    if (useCloud) {
      await saveAiInsightsCloud(analysis.insights, likedArticles.length);
    } else {
      saveAiInsights(analysis.insights, likedArticles.length);
    }

    return NextResponse.json({
      success: true,
      insights: analysis.insights,
      articlesAnalyzed: likedArticles.length,
    });
  } catch (error) {
    console.error("Error analyzing preferences:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze preferences",
      },
      { status: 500 }
    );
  }
}
