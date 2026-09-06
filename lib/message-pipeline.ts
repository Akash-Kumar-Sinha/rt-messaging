import { z } from "zod";
import { checkProfanity } from "./moderation/profanity";
import {
  messagesDb,
  membersDb,
  conversationsDb,
  receiptsDb,
  mediaDb,
  usersDb,
  moderationLogsDb,
  verifyConversationMembership,
} from "./db";
import { messageRateLimiter } from "./rate-limit";
import { redisPub } from "./redis";

export const SendMessageSchema = z.object({
  clientMessageId: z.string().min(1, "clientMessageId is required"),
  conversationId: z.string().uuid("Invalid conversationId"),
  type: z.enum(["TEXT", "IMAGE", "GIF", "STICKER"]).default("TEXT"),
  content: z.string().max(10000, "Message content is too long").nullable().optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
  mediaId: z.string().uuid().nullable().optional(),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;

export interface PipelineResult {
  success: boolean;
  message?: any;
  error?: {
    code:
      | "VALIDATION_ERROR"
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "RATE_LIMITED"
      | "MODERATION_REJECTED"
      | "MEDIA_INVALID"
      | "DUPLICATE_MESSAGE"
      | "SERVER_ERROR";
    message: string;
    details?: any;
  };
}

export async function processSendMessagePipeline(
  senderId: string,
  rawPayload: unknown,
  originConnectionId?: string
): Promise<PipelineResult> {
  const parseResult = SendMessageSchema.safeParse(rawPayload);
  if (!parseResult.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Payload schema validation failed.",
        details: parseResult.error.flatten(),
      },
    };
  }

  const payload = parseResult.data;

  const isMember = await verifyConversationMembership(payload.conversationId, senderId);
  if (!isMember) {
    return {
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "You are not a participant in this conversation.",
      },
    };
  }

  const rateLimit = await messageRateLimiter.check(senderId);
  if (!rateLimit.allowed) {
    const retryAfter =
      rateLimit.retryAfter ||
      Math.max(1, Math.ceil((rateLimit.resetTimeMs - Date.now()) / 1000));
    return {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "You are sending messages too quickly. Please try again shortly.",
        details: {
          retryAfter,
          limit: rateLimit.totalLimit,
          resetTimeMs: rateLimit.resetTimeMs,
        },
      },
    };
  }

  // Idempotency: if clientMessageId exists for this sender in this conversation, return the persisted message
  if (payload.clientMessageId) {
    const existing = await messagesDb
      .where({
        clientMessageId: payload.clientMessageId,
        senderId,
        conversationId: payload.conversationId,
      })
      .first();
    if (existing) {
      const senderUser = await usersDb.where({ id: existing.senderId }).first();
      let mediaObject = null;
      if (existing.mediaId) {
        const m = await mediaDb.where({ id: existing.mediaId }).first();
        if (m) {
          mediaObject = {
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
      return {
        success: true,
        message: {
          ...existing,
          media: mediaObject,
          sender: senderUser
            ? {
                id: senderUser.id,
                username: senderUser.username,
                displayName: senderUser.displayName,
                avatarUrl: senderUser.avatarUrl,
              }
            : null,
        },
      };
    }
  }

  if (payload.content && payload.content.trim().length > 0) {
    const profanityResult = checkProfanity(payload.content);
    if (!profanityResult.passed) {
      await moderationLogsDb.create({
        id: crypto.randomUUID(),
        targetType: "MESSAGE",
        targetId: null,
        userId: senderId,
        flagType: "PROFANITY",
        score: profanityResult.score,
        reason: profanityResult.reason || "Prohibited profanity detected",
        passed: false,
        createdAt: new Date().toISOString(),
      });

      return {
        success: false,
        error: {
          code: "MODERATION_REJECTED",
          message: profanityResult.reason || "Your message contains prohibited words.",
          details: { matchedWords: profanityResult.matchedWords },
        },
      };
    }
  }

  let effectiveMediaId: string | null = payload.mediaId || null;

  if (payload.type === "IMAGE") {
    if (!payload.mediaId) {
      return {
        success: false,
        error: {
          code: "MEDIA_INVALID",
          message: "Media attachment ID is required for image messages.",
        },
      };
    }

    const media = await mediaDb.where({ id: payload.mediaId }).first();
    if (!media) {
      return {
        success: false,
        error: {
          code: "MEDIA_INVALID",
          message: "Attached media not found.",
        },
      };
    }

    if (media.status !== "APPROVED") {
      return {
        success: false,
        error: {
          code: "MODERATION_REJECTED",
          message: "This image couldn't be sent because it doesn't meet our content guidelines.",
        },
      };
    }

    const isForwarded =
      payload.metadata &&
      typeof payload.metadata === "object" &&
      ((payload.metadata as any).isForwarded === true ||
        Boolean((payload.metadata as any).forwardedFrom));

    if (media.conversationId !== payload.conversationId || media.uploaderId !== senderId) {
      if (isForwarded) {
        // Clone approved media record for the target conversation so its members are authorized to view it
        const newMediaId = crypto.randomUUID();
        const nowMedia = new Date().toISOString();
        await mediaDb.create({
          id: newMediaId,
          uploaderId: senderId,
          conversationId: payload.conversationId,
          originalFilename: media.originalFilename,
          mimeType: media.mimeType,
          byteSize: media.byteSize,
          width: media.width,
          height: media.height,
          storagePath: media.storagePath,
          status: "APPROVED",
          moderationDetails: media.moderationDetails,
          createdAt: nowMedia,
          updatedAt: nowMedia,
        });
        effectiveMediaId = newMediaId;
      } else {
        return {
          success: false,
          error: {
            code: "MEDIA_INVALID",
            message: "Media attachment does not belong to this conversation or sender.",
          },
        };
      }
    }
  }

  if (payload.type === "GIF" || payload.type === "STICKER") {
    const rawUrl =
      payload.metadata && typeof payload.metadata === "object"
        ? (payload.metadata as any).url
        : null;

    if (!rawUrl || typeof rawUrl !== "string") {
      return {
        success: false,
        error: {
          code: "MEDIA_INVALID",
          message: `${payload.type} message requires a valid media URL in metadata.`,
        },
      };
    }

    const isTrustedMediaUrl = (candidateUrl: string): boolean => {
      try {
        const parsed = new URL(candidateUrl);
        if (parsed.protocol !== "https:") return false;
        const host = parsed.hostname.toLowerCase();
        return (
          host === "giphy.com" ||
          host.endsWith(".giphy.com") ||
          host === "images.unsplash.com"
        );
      } catch {
        return false;
      }
    };

    if (!isTrustedMediaUrl(rawUrl)) {
      return {
        success: false,
        error: {
          code: "MEDIA_INVALID",
          message: "Media URL origin is not permitted.",
        },
      };
    }
  }

  const messageId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await messagesDb.create({
      id: messageId,
      conversationId: payload.conversationId,
      senderId,
      clientMessageId: payload.clientMessageId,
      type: payload.type,
      content: payload.content || null,
      metadata: payload.metadata || null,
      status: "SENT",
      moderationStatus: "APPROVED",
      mediaId: effectiveMediaId,
      createdAt: now,
      updatedAt: now,
    });
  } catch (createErr: any) {
    if (payload.clientMessageId) {
      const existing = await messagesDb
        .where({
          clientMessageId: payload.clientMessageId,
          senderId,
          conversationId: payload.conversationId,
        })
        .first();
      if (existing) {
        const senderUser = await usersDb.where({ id: existing.senderId }).first();
        return {
          success: true,
          message: {
            ...existing,
            media: null,
            sender: senderUser
              ? {
                  id: senderUser.id,
                  username: senderUser.username,
                  displayName: senderUser.displayName,
                  avatarUrl: senderUser.avatarUrl,
                }
              : null,
          },
        };
      }
    }
    throw createErr;
  }

  await conversationsDb.where({ id: payload.conversationId }).update({ updatedAt: now });

  const members = await membersDb.where({ conversationId: payload.conversationId }).all();
  for (const member of members) {
    if (member.userId !== senderId) {
      await membersDb.where({ id: member.id }).update({
        unreadCount: (member.unreadCount || 0) + 1,
      });

      await receiptsDb.create({
        id: crypto.randomUUID(),
        messageId,
        userId: member.userId,
        status: "DELIVERED",
        deliveredAt: now,
        readAt: null,
      });
    }
  }

  const createdMessage = await messagesDb.where({ id: messageId }).first();
  const senderUser = await usersDb.where({ id: senderId }).first();
  let mediaObject = null;
  if (effectiveMediaId) {
    const m = await mediaDb.where({ id: effectiveMediaId }).first();
    if (m) {
      mediaObject = {
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

  const enrichedMessage = {
    ...createdMessage,
    media: mediaObject,
    sender: senderUser
      ? {
          id: senderUser.id,
          username: senderUser.username,
          displayName: senderUser.displayName,
          avatarUrl: senderUser.avatarUrl,
        }
      : null,
  };

  try {
    const broadcastEvent = {
      type: "MESSAGE_CREATED",
      conversationId: payload.conversationId,
      senderId,
      excludeConnectionId: originConnectionId,
      message: enrichedMessage,
    };
    await redisPub.publish("chat:events", JSON.stringify(broadcastEvent));
  } catch (err) {
    console.warn("Failed to publish to redis pubsub:", err);
  }

  return {
    success: true,
    message: enrichedMessage,
  };
}
