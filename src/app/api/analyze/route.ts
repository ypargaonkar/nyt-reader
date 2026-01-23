import { NextRequest, NextResponse } from "next/server";
import {
  getLikedArticles,
  getProfileEntries,
  updateProfileScore,
  saveAiInsights,
  getLatestAiInsights,
} from "@/lib/db";
import {
  analyzeReadingPreferences,
  buildProfileFromEntries,
} from "@/lib/ai-analyzer";

export async function POST(request: NextRequest) {
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
    const likedArticles = getLikedArticles(20); // Analyze last 20 liked articles

    if (likedArticles.length < 3) {
      return NextResponse.json(
        { error: "Need at least 3 liked articles to analyze preferences" },
        { status: 400 }
      );
    }

    // Get current profile
    const profileEntries = getProfileEntries();
    const latestInsights = getLatestAiInsights();
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

    // Update section scores
    Object.entries(updates.sections).forEach(([section, score]) => {
      updateProfileScore("section", section, score);
    });

    // Update topic scores
    Object.entries(updates.topics).forEach(([topic, score]) => {
      updateProfileScore("topic", topic, score);
    });

    // Update reporter scores
    Object.entries(updates.reporters).forEach(([reporter, score]) => {
      updateProfileScore("reporter", reporter, score);
    });

    // Update organization scores
    Object.entries(updates.organizations).forEach(([org, score]) => {
      updateProfileScore("organization", org, score);
    });

    // Update location scores
    Object.entries(updates.locations).forEach(([loc, score]) => {
      updateProfileScore("location", loc, score);
    });

    // Update material type scores
    Object.entries(updates.materialTypes).forEach(([type, score]) => {
      updateProfileScore("materialType", type, score);
    });

    // Update preferences
    if (updates.multimediaPreference !== undefined) {
      updateProfileScore(
        "prefersMultimedia",
        "value",
        updates.multimediaPreference
      );
    }
    if (updates.interactivePreference !== undefined) {
      updateProfileScore(
        "prefersInteractive",
        "value",
        updates.interactivePreference
      );
    }

    // Save insights
    saveAiInsights(analysis.insights, likedArticles.length);

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
