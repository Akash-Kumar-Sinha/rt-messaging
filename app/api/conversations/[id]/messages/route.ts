import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import {
  messagesDb,
  receiptsDb,
  usersDb,
  mediaDb,
  verifyConversationMembership,
} from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: conversationId } = await params;

    // Authorization: Verify user is a member of this conversation
    const isMember = await verifyConversationMembership(conversationId, user.id);
    if (!isMember) {
      return NextResponse.json(
        { error: "You are not authorized to view this conversation" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "30", 10)));
    const before = searchParams.get("before"); // cursor: message ID or timestamp
    const after = searchParams.get("after"); // for syncing newer messages after reconnect

    // DB-level pagination with cursor filtering
    let cursorBeforeDate: string | null = null;
    if (before) {
      const cursorMsg = await messagesDb.where({ id: before }).first();
      if (cursorMsg) {
        cursorBeforeDate = cursorMsg.createdAt;
      } else if (!isNaN(new Date(before).getTime())) {
        cursorBeforeDate = before;
      }
    }

    let cursorAfterDate: string | null = null;
    if (after) {
      const cursorMsg = await messagesDb.where({ id: after }).first();
      if (cursorMsg) {
        cursorAfterDate = cursorMsg.createdAt;
      } else if (!isNaN(new Date(after).getTime())) {
        cursorAfterDate = after;
      }
    }

    let query = messagesDb.where({ conversationId });
    if (cursorBeforeDate) {
      query = query.where((m) => m.createdAt.lt(cursorBeforeDate!));
    }
    if (cursorAfterDate) {
      query = query.where((m) => m.createdAt.gt(cursorAfterDate!));
    }

    const rawMessages = await query
      .orderBy((m) => m.createdAt.desc())
      .limit(limit + 1)
      .all();

    const hasMore = rawMessages.length > limit;
    const page = hasMore ? rawMessages.slice(0, limit) : rawMessages;
    const nextCursor = hasMore && page.length > 0 ? page[page.length - 1].id : null;

    // Batch fetch senders, media, and receipts in parallel to eliminate N+1 queries
    const uniqueSenderIds = [...new Set(page.map((m) => m.senderId))];
    const uniqueMediaIds = [...new Set(page.map((m) => m.mediaId).filter(Boolean))] as string[];

    const [sendersList, mediaItems, receiptsList] = await Promise.all([
      Promise.all(uniqueSenderIds.map((id) => usersDb.where({ id }).first())),
      Promise.all(uniqueMediaIds.map((id) => mediaDb.where({ id }).first())),
      Promise.all(page.map((m) => receiptsDb.where({ messageId: m.id }).all())),
    ]);

    const sendersMap = new Map(sendersList.filter(Boolean).map((u) => [u!.id, u!]));
    const mediaMap = new Map(mediaItems.filter(Boolean).map((m) => [m!.id, m!]));
    const receiptsMap = new Map(page.map((m, idx) => [m.id, receiptsList[idx] || []]));

    // Enrich messages with sender information, receipt status, and media details
    const enrichedMessages = [];
    for (const msg of page) {
      const sender = sendersMap.get(msg.senderId) || null;
      let media = null;
      if (msg.mediaId) {
        const m = mediaMap.get(msg.mediaId);
        if (m && m.status === "APPROVED") {
          media = {
            id: m.id,
            originalFilename: m.originalFilename,
            mimeType: m.mimeType,
            width: m.width,
            height: m.height,
            byteSize: m.byteSize,
            url: `/api/media/${m.id}`,
          };
        }
      }

      // Get receipt status for this message
      const receipts = receiptsMap.get(msg.id) || [];
      let deliveryStatus = msg.status;
      if (receipts.some((r: any) => r.status === "READ")) {
        deliveryStatus = "READ";
      } else if (receipts.some((r: any) => r.status === "DELIVERED")) {
        deliveryStatus = "DELIVERED";
      }

      let parsedMetadata = msg.metadata;
      if (typeof parsedMetadata === "string") {
        try {
          parsedMetadata = JSON.parse(parsedMetadata);
        } catch {}
      }

      enrichedMessages.push({
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        clientMessageId: msg.clientMessageId,
        type: msg.type,
        content: msg.content,
        metadata: parsedMetadata || null,
        status: deliveryStatus,
        media,
        sender: sender
          ? {
              id: sender.id,
              username: sender.username,
              displayName: sender.displayName,
              avatarUrl: sender.avatarUrl,
            }
          : null,
        createdAt: msg.createdAt,
      });
    }

    // Return in chronological order (oldest to newest)
    enrichedMessages.reverse();

    return NextResponse.json({
      messages: enrichedMessages,
      nextCursor,
      hasMore,
    });
  } catch (err) {
    console.error("Fetch messages error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const body = await request.json();
    const { processSendMessagePipeline } = await import("@/lib/message-pipeline");
    const result = await processSendMessagePipeline(user.id, {
      ...body,
      conversationId,
    });

    if (!result.success) {
      if (result.error?.code === "RATE_LIMITED") {
        const retryAfter = result.error.details?.retryAfter || 1;
        return NextResponse.json(
          {
            code: "MESSAGE_RATE_LIMITED",
            message:
              result.error.message ||
              "You are sending messages too quickly. Please try again shortly.",
            retryAfter,
            details: result.error.details,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfter),
            },
          }
        );
      }

      const status =
        result.error?.code === "UNAUTHORIZED"
          ? 401
          : result.error?.code === "FORBIDDEN"
          ? 403
          : result.error?.code === "MODERATION_REJECTED"
          ? 422
          : 400;

      return NextResponse.json(
        {
          error: result.error?.message,
          code: result.error?.code,
          details: result.error?.details,
        },
        { status }
      );
    }

    return NextResponse.json({ message: result.message }, { status: 201 });
  } catch (err) {
    console.error("REST Send conversation message error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
