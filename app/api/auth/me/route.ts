import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { usersDb } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getSessionUserFromRequest(request);
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const userRecord = await usersDb.where({ id: session.id }).first();
    if (!userRecord) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: userRecord.id,
        username: userRecord.username,
        email: userRecord.email,
        displayName: userRecord.displayName,
        avatarUrl: userRecord.avatarUrl,
        lastSeenAt: userRecord.lastSeenAt,
      },
    });
  } catch (err) {
    console.error("Auth me error:", err);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
