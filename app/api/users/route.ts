import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { usersDb, membersDb } from "@/lib/db";
import { isUserOnline } from "@/lib/redis";

export async function GET(request: Request) {
  try {
    const session = await getSessionUserFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim().toLowerCase() || "";
    const excludeExisting = searchParams.get("excludeExisting") === "true";

    // Only search when query is non-empty to avoid full-table scans and eager loading
    if (!query) {
      return NextResponse.json({ users: [] });
    }

    const excludeUserIds = new Set<string>([session.id]);

    if (excludeExisting) {
      const myMemberships = await membersDb.where({ userId: session.id }).all();
      for (const m of myMemberships) {
        const convMembers = await membersDb.where({ conversationId: m.conversationId }).all();
        for (const cm of convMembers) {
          excludeUserIds.add(cm.userId);
        }
      }
    }

    // Query matching users at DB level using ilike and limit
    const [usernameMatches, displayNameMatches] = await Promise.all([
      usersDb.where((u) => u.username.ilike(`%${query}%`)).limit(20).all(),
      usersDb.where((u) => u.displayName.ilike(`%${query}%`)).limit(20).all(),
    ]);

    const seen = new Set<string>();
    const matches: typeof usernameMatches = [];

    for (const u of [...usernameMatches, ...displayNameMatches]) {
      if (
        !seen.has(u.id) &&
        !excludeUserIds.has(u.id) &&
        !u.username.startsWith("test_") &&
        !u.username.startsWith("demo_")
      ) {
        seen.add(u.id);
        matches.push(u);
        if (matches.length >= 20) break;
      }
    }

    const enriched = await Promise.all(
      matches.map(async (u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        isOnline: await isUserOnline(u.id),
      }))
    );

    return NextResponse.json({ users: enriched });
  } catch (err) {
    console.error("Users search error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
