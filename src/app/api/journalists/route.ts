import { NextRequest, NextResponse } from "next/server";
import {
  followJournalist,
  unfollowJournalist,
  isJournalistFollowed,
  getFollowedJournalists,
  deleteProfileEntry,
} from "@/lib/db";
import {
  followJournalistCloud,
  unfollowJournalistCloud,
  isJournalistFollowedCloud,
  getFollowedJournalistsCloud,
  deleteProfileEntryCloud,
} from "@/lib/db-cloud";
import { isTursoConfigured } from "@/lib/turso";

// GET - Fetch all followed journalists
export async function GET() {
  const useCloud = isTursoConfigured();

  try {
    const journalists = useCloud
      ? await getFollowedJournalistsCloud()
      : getFollowedJournalists();
    return NextResponse.json({ journalists });
  } catch (error) {
    console.error("Error fetching followed journalists:", error);
    return NextResponse.json(
      { error: "Failed to fetch followed journalists" },
      { status: 500 }
    );
  }
}

// POST - Follow or unfollow a journalist
export async function POST(request: NextRequest) {
  const useCloud = isTursoConfigured();

  try {
    const { name, action } = (await request.json()) as {
      name: string;
      action: "follow" | "unfollow" | "toggle";
    };

    if (!name) {
      return NextResponse.json(
        { error: "Journalist name is required" },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    if (!cleanName) {
      return NextResponse.json(
        { error: "Invalid journalist name" },
        { status: 400 }
      );
    }

    let isFollowing: boolean;

    if (action === "toggle") {
      // Toggle follow status
      const currentlyFollowed = useCloud
        ? await isJournalistFollowedCloud(cleanName)
        : isJournalistFollowed(cleanName);
      if (currentlyFollowed) {
        if (useCloud) {
          await unfollowJournalistCloud(cleanName);
          // Also remove their profile score boost
          await deleteProfileEntryCloud("reporter", cleanName);
        } else {
          unfollowJournalist(cleanName);
          deleteProfileEntry("reporter", cleanName);
        }
        isFollowing = false;
      } else {
        if (useCloud) {
          await followJournalistCloud(cleanName);
        } else {
          followJournalist(cleanName);
        }
        isFollowing = true;
      }
    } else if (action === "follow") {
      if (useCloud) {
        await followJournalistCloud(cleanName);
      } else {
        followJournalist(cleanName);
      }
      isFollowing = true;
    } else if (action === "unfollow") {
      if (useCloud) {
        await unfollowJournalistCloud(cleanName);
        // Also remove their profile score boost
        await deleteProfileEntryCloud("reporter", cleanName);
      } else {
        unfollowJournalist(cleanName);
        deleteProfileEntry("reporter", cleanName);
      }
      isFollowing = false;
    } else {
      return NextResponse.json(
        { error: "Invalid action. Must be follow, unfollow, or toggle" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      name: cleanName,
      isFollowing,
    });
  } catch (error) {
    console.error("Error updating journalist follow status:", error);
    return NextResponse.json(
      { error: "Failed to update follow status" },
      { status: 500 }
    );
  }
}
