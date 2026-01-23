import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    const correctPassword = process.env.APP_PASSWORD;

    if (!correctPassword) {
      // No password set - accept any token (for development)
      return NextResponse.json({ valid: true });
    }

    // Verify token matches expected hash
    const expectedToken = crypto
      .createHash("sha256")
      .update(correctPassword + (process.env.APP_SECRET || "nyt-reader-secret"))
      .digest("hex");

    if (token === expectedToken) {
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
