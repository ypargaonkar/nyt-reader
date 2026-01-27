import { NextRequest, NextResponse } from "next/server";
import {
  getProfileEntries,
  getLatestAiInsights,
  getInteractions,
  getTopProfileEntries,
  deleteProfileEntry,
} from "@/lib/db";
import {
  getProfileEntriesCloud,
  getLatestAiInsightsCloud,
  getInteractionsCloud,
  getTopProfileEntriesCloud,
  deleteProfileEntryCloud,
} from "@/lib/db-cloud";
import { isTursoConfigured } from "@/lib/turso";
import { buildProfileFromEntries } from "@/lib/ai-analyzer";

export async function GET() {
  const useCloud = isTursoConfigured();

  try {
    // Get all profile entries
    const allEntries = useCloud
      ? await getProfileEntriesCloud()
      : getProfileEntries();
    const latestInsights = useCloud
      ? await getLatestAiInsightsCloud()
      : getLatestAiInsights();

    // Count total likes
    const likedInteractions = useCloud
      ? await getInteractionsCloud("liked")
      : getInteractions("liked");
    const totalLikes = likedInteractions.length;

    // Build profile
    const profile = buildProfileFromEntries(
      allEntries,
      latestInsights?.insights || null,
      totalLikes
    );

    // Get top entries for each category
    const topSections = useCloud
      ? await getTopProfileEntriesCloud("section", 10)
      : getTopProfileEntries("section", 10);
    const topTopics = useCloud
      ? await getTopProfileEntriesCloud("topic", 15)
      : getTopProfileEntries("topic", 15);
    const topReporters = useCloud
      ? await getTopProfileEntriesCloud("reporter", 10)
      : getTopProfileEntries("reporter", 10);
    const topOrganizations = useCloud
      ? await getTopProfileEntriesCloud("organization", 10)
      : getTopProfileEntries("organization", 10);
    const topLocations = useCloud
      ? await getTopProfileEntriesCloud("location", 10)
      : getTopProfileEntries("location", 10);
    const topMaterialTypes = useCloud
      ? await getTopProfileEntriesCloud("materialType", 10)
      : getTopProfileEntries("materialType", 10);

    // Calculate reading stats
    const readInteractions = useCloud
      ? await getInteractionsCloud("read")
      : getInteractions("read");
    const dismissedInteractions = useCloud
      ? await getInteractionsCloud("dismissed")
      : getInteractions("dismissed");

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

export async function DELETE(request: NextRequest) {
  const useCloud = isTursoConfigured();

  try {
    const { category, value } = await request.json();

    if (!category || !value) {
      return NextResponse.json(
        { error: "category and value are required" },
        { status: 400 }
      );
    }

    if (useCloud) {
      await deleteProfileEntryCloud(category, value);
    } else {
      deleteProfileEntry(category, value);
    }

    return NextResponse.json({ success: true, category, value });
  } catch (error) {
    console.error("Error deleting profile entry:", error);
    return NextResponse.json(
      { error: "Failed to delete profile entry" },
      { status: 500 }
    );
  }
}
