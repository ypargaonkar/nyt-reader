import { NextRequest, NextResponse } from "next/server";
import {
  followJournalist,
  unfollowJournalist,
  isJournalistFollowed,
  getFollowedJournalists,
} from "@/lib/db";

// GET - Fetch all followed journalists
export async function GET() {
  try {
    const journalists = getFollowedJournalists();
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
      if (isJournalistFollowed(cleanName)) {
        unfollowJournalist(cleanName);
        isFollowing = false;
      } else {
        followJournalist(cleanName);
        isFollowing = true;
      }
    } else if (action === "follow") {
      followJournalist(cleanName);
      isFollowing = true;
    } else if (action === "unfollow") {
      unfollowJournalist(cleanName);
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
