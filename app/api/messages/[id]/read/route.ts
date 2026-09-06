import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { receiptsDb, messagesDb, membersDb, verifyConversationMembership } from "@/lib/db";
import { redisPub } from "@/lib/redis";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: messageId } = await params;
    const message = await messagesDb.where({ id: messageId }).first();
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const isMember = await verifyConversationMembership(message.conversationId, user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Update receipt
    const existingReceipt = await receiptsDb
      .where({ messageId, userId: user.id })
      .first();

    if (existingReceipt) {
      await receiptsDb.where({ id: existingReceipt.id }).update({
        status: "READ",
        readAt: now,
      });
    }

    // Reset unread count for member
    const member = await membersDb
      .where({ conversationId: message.conversationId, userId: user.id })
      .first();
    if (member) {
      await membersDb.where({ id: member.id }).update({
        unreadCount: 0,
        lastReadAt: now,
      });
    }

    // Publish read event
    try {
      await redisPub.publish(
        "chat:events",
        JSON.stringify({
          type: "MESSAGE_READ",
          conversationId: message.conversationId,
          userId: user.id,
          messageId,
          readAt: now,
        })
      );
    } catch {}

    return NextResponse.json({ success: true, readAt: now });
  } catch (err) {
    console.error("Mark read error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
