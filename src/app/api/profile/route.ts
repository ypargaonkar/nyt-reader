import { NextResponse } from "next/server";
import {
  getProfileEntries,
  getLatestAiInsights,
  getInteractions,
  getTopProfileEntries,
} from "@/lib/db";
import { buildProfileFromEntries } from "@/lib/ai-analyzer";

export async function GET() {
  try {
    // Get all profile entries
    const allEntries = getProfileEntries();
    const latestInsights = getLatestAiInsights();

    // Count total likes
    const likedInteractions = getInteractions("liked");
    const totalLikes = likedInteractions.length;

    // Build profile
    const profile = buildProfileFromEntries(
      allEntries,
      latestInsights?.insights || null,
      totalLikes
    );

    // Get top entries for each category
    const topSections = getTopProfileEntries("section", 10);
    const topTopics = getTopProfileEntries("topic", 15);
    const topReporters = getTopProfileEntries("reporter", 10);
    const topOrganizations = getTopProfileEntries("organization", 10);
    const topLocations = getTopProfileEntries("location", 10);
    const topMaterialTypes = getTopProfileEntries("materialType", 10);

    // Calculate reading stats
    const readInteractions = getInteractions("read");
    const dismissedInteractions = getInteractions("dismissed");

    const stats = {
      totalRead: readInteractions.length,
      totalLiked: totalLikes,
      totalDismissed: dismissedInteractions.length,
      likeRate: totalLikes / (readInteractions.length || 1),
    };

    return NextResponse.json({
      profile,
      topSections: topSections.map((e) => ({ name: e.value, score: e.score })),
      topTopics: topTopics.map((e) => ({ name: e.value, score: e.score })),
      topReporters: topReporters.map((e) => ({ name: e.value, score: e.score })),
      topOrganizations: topOrganizations.map((e) => ({
        name: e.value,
        score: e.score,
      })),
      topLocations: topLocations.map((e) => ({ name: e.value, score: e.score })),
      topMaterialTypes: topMaterialTypes.map((e) => ({
        name: e.value,
        score: e.score,
      })),
      stats,
      lastAnalyzed: latestInsights?.analyzedAt || null,
      aiInsights: latestInsights?.insights || null,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
