import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { getOnlineUsers } from "@/lib/redis";

export async function GET(request: Request) {
  const user = await getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const onlineUserIds = await getOnlineUsers();
  return NextResponse.json({ onlineUserIds });
}
