import { NextResponse } from "next/server";
import {
  getTodayApiCallCount,
  getLastApiCallTime,
  getRecentApiCalls,
} from "@/lib/db";
import {
  getTodayApiCallCountCloud,
  getLastApiCallTimeCloud,
  getRecentApiCallsCloud,
  getLast24HoursApiCallsCloud,
} from "@/lib/db-cloud";
import { isTursoConfigured } from "@/lib/turso";

export async function GET() {
  const useCloud = isTursoConfigured();

  try {
    const todayCalls = useCloud
      ? await getTodayApiCallCountCloud()
      : getTodayApiCallCount();
    const lastCallTime = useCloud
      ? await getLastApiCallTimeCloud()
      : getLastApiCallTime();
    const callsLastMinute = useCloud
      ? await getRecentApiCallsCloud(1)
      : getRecentApiCalls(1);

    const dailyLimit = 500;
    const minuteLimit = 5;

    // Get detailed 24h history for cloud
    const last24Hours = useCloud ? await getLast24HoursApiCallsCloud() : null;

    return NextResponse.json({
      todayCalls,
      dailyLimit,
      dailyRemaining: Math.max(0, dailyLimit - todayCalls),
      dailyPercentUsed: Math.round((todayCalls / dailyLimit) * 100),
      callsLastMinute,
      minuteLimit,
      canMakeCall: callsLastMinute < minuteLimit && todayCalls < dailyLimit,
      lastCallTime,
      lastCallAgo: lastCallTime ? Date.now() - lastCallTime : null,
      last24Hours: last24Hours?.length || 0,
      recentCalls: last24Hours?.slice(0, 20) || null, // Last 20 calls for debugging
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage stats" },
      { status: 500 }
    );
  }
}
