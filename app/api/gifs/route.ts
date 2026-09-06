import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { searchGiphyAssets } from "@/lib/giphy";

export async function GET(request: Request) {
  const user = await getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(
    `gifs:${user.id}`,
    RATE_LIMITS.GIPHY_SEARCH.limit,
    RATE_LIMITS.GIPHY_SEARCH.windowSeconds
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || undefined;
  const results = await searchGiphyAssets({
    type: "GIF",
    query,
    limit: 24,
    minCacheThreshold: 12,
  });
  return NextResponse.json({ gifs: results });
}
