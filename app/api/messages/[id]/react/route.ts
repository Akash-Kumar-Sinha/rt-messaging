import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { messagesDb, verifyConversationMembership } from "@/lib/db";
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
    const body = await request.json();
    const { emoji, action, conversationId } = body;

    if (!emoji) {
      return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
    }

    const msg =
      (await messagesDb.where({ id: messageId }).first()) ||
      (await messagesDb.where({ clientMessageId: messageId }).first());

    if (!msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (conversationId && msg.conversationId !== conversationId) {
      return NextResponse.json({ error: "Message does not belong to specified conversation" }, { status: 400 });
    }

    const isMember = await verifyConversationMembership(msg.conversationId, user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let rawMeta = msg.metadata;
    let metadata: any = {};
    if (typeof rawMeta === "string") {
      try {
        metadata = JSON.parse(rawMeta);
      } catch {
        metadata = {};
      }
    } else if (rawMeta && typeof rawMeta === "object") {
      metadata = { ...rawMeta };
    }

    let reactions = { ...(metadata.reactions || {}) };
    let userList: string[] = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];

    const hasReacted = userList.includes(user.id);
    const shouldAdd = action === "add" ? true : action === "remove" ? false : !hasReacted;

    if (shouldAdd) {
      if (!hasReacted) userList.push(user.id);
      reactions[emoji] = userList;
    } else {
      userList = userList.filter((id) => id !== user.id);
      if (userList.length === 0) {
        delete reactions[emoji];
      } else {
        reactions[emoji] = userList;
      }
    }

    metadata.reactions = reactions;
    await messagesDb.where({ id: msg.id }).update({ metadata });

    // Publish event to Redis PubSub for real-time broadcast
    try {
      await redisPub.publish(
        "chat:events",
        JSON.stringify({
          type: "MESSAGE_REACTION_UPDATED",
          conversationId: msg.conversationId,
          messageId: msg.id,
          clientMessageId: msg.clientMessageId,
          reactions,
          userId: user.id,
          emoji,
        })
      );
    } catch {}

    return NextResponse.json({ success: true, reactions });
  } catch (err) {
    console.error("React error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
