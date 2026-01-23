import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    const correctPassword = process.env.APP_PASSWORD;

    if (!correctPassword) {
      // No password set - allow access (for development)
      const token = crypto.randomBytes(32).toString("hex");
      return NextResponse.json({ token });
    }

    if (password === correctPassword) {
      // Generate a simple token (hash of password + secret)
      const token = crypto
        .createHash("sha256")
        .update(correctPassword + (process.env.APP_SECRET || "nyt-reader-secret"))
        .digest("hex");

      return NextResponse.json({ token });
    }

    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
