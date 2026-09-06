import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import {
  conversationsDb,
  membersDb,
  usersDb,
  messagesDb,
  getOrCreateDirectConversation,
} from "@/lib/db";
import { isUserOnline, redisPub } from "@/lib/redis";
import { z } from "zod";

const CreateConversationSchema = z.object({
  recipientId: z.string().min(1, "recipientId is required"),
});

export async function GET(request: Request) {
  try {
    const user = await getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user memberships
    const memberships = await membersDb.where({ userId: user.id }).all();
    if (memberships.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const conversationsList = [];

    for (const membership of memberships) {
      const conv = await conversationsDb.where({ id: membership.conversationId }).first();
      if (!conv) continue;

      // Get other members
      const allMembers = await membersDb.where({ conversationId: conv.id }).all();
      const otherMemberRecords = allMembers.filter((m) => m.userId !== user.id);

      const otherUsers = [];
      for (const m of otherMemberRecords) {
        const u = await usersDb.where({ id: m.userId }).first();
        if (u) {
          const online = await isUserOnline(u.id);
          otherUsers.push({
            id: u.id,
            username: u.username,
            displayName: u.displayName,
            avatarUrl: u.avatarUrl,
            lastSeenAt: u.lastSeenAt,
            isOnline: online,
          });
        }
      }

      // Fetch last message directly with DB LIMIT 1
      const lastMessage = await messagesDb
        .where({ conversationId: conv.id })
        .orderBy((m) => m.createdAt.desc())
        .limit(1)
        .first();

      conversationsList.push({
        id: conv.id,
        type: conv.type,
        title: conv.title,
        unreadCount: membership.unreadCount,
        lastReadAt: membership.lastReadAt,
        otherUser: otherUsers[0] || null,
        participants: otherUsers,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content,
              type: lastMessage.type,
              senderId: lastMessage.senderId,
              createdAt: lastMessage.createdAt,
              status: lastMessage.status,
            }
          : null,
        updatedAt: conv.updatedAt,
      });
    }

    // Sort conversations by latest message / update
    conversationsList.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return NextResponse.json({ conversations: conversationsList });
  } catch (err) {
    console.error("Fetch conversations error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parse = CreateConversationSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Invalid request data", details: parse.error.flatten() }, { status: 400 });
    }

    const { recipientId } = parse.data;
    if (recipientId === user.id) {
      return NextResponse.json({ error: "Cannot create conversation with yourself" }, { status: 400 });
    }

    const recipient = await usersDb.where({ id: recipientId }).first();
    if (!recipient) {
      return NextResponse.json({ error: "Recipient user not found" }, { status: 404 });
    }

    const conversation = await getOrCreateDirectConversation(user.id, recipientId);

    // Broadcast real-time conversation created event to both users
    try {
      if (conversation) {
        await redisPub.publish(
          "chat:events",
          JSON.stringify({
            type: "CONVERSATION_CREATED",
            conversationId: conversation.id,
            memberIds: [user.id, recipientId],
            creator: {
              id: user.id,
              displayName: user.displayName,
              username: user.username,
              avatarUrl: user.avatarUrl,
            },
          })
        );
      }
    } catch (publishErr) {
      console.warn("Failed to publish conversation creation to Redis:", publishErr);
    }

    return NextResponse.json({ conversation });
  } catch (err) {
    console.error("Create conversation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
