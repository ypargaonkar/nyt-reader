import { NextResponse } from "next/server";
import {
  getTodayApiCallCount,
  getLastApiCallTime,
  getRecentApiCalls,
} from "@/lib/db";

export async function GET() {
  try {
    const todayCalls = getTodayApiCallCount();
    const lastCallTime = getLastApiCallTime();
    const callsLastMinute = getRecentApiCalls(1);

    const dailyLimit = 500;
    const minuteLimit = 5;

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
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage stats" },
      { status: 500 }
    );
  }
}
