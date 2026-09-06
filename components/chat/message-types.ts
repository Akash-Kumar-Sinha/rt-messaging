export interface MessageReplyMetadata {
  id?: string;
  clientMessageId?: string;
  senderName?: string;
  content?: string;
}

/**
 * Free-form metadata blob attached to a message.
 * Shape varies by message type: GIFs carry `url`/`previewUrl`/`provider`,
 * stickers carry `packId`/`emoji`, and any type can carry `replyTo` or `reactions`.
 */
export interface MessageMetadata {
  id?: string;
  url?: string;
  previewUrl?: string;
  title?: string;
  name?: string;
  packId?: string;
  emoji?: string;
  width?: number;
  height?: number;
  provider?: string;
  isForwarded?: boolean;
  replyTo?: MessageReplyMetadata;
  reactions?: string | Record<string, string[]>;
}

export type FailureReason =
  | "PROFANITY_REJECTED"
  | "MODERATION_FAILED"
  | "RATE_LIMITED"
  | "NETWORK_FAILED";

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  clientMessageId?: string;
  type: "TEXT" | "IMAGE" | "GIF" | "STICKER";
  content?: string | null;
  metadata?: MessageMetadata;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED" | "PENDING";
  failureReason?: FailureReason | string;
  errorReason?: string;
  media?: {
    id: string;
    url: string;
    originalFilename: string;
    mimeType: string;
    width?: number;
    height?: number;
  } | null;
  sender?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  } | null;
  createdAt: string;
}

export function getMessageSenderName(message: Pick<MessageItem, "sender">): string {
  return message.sender?.displayName || message.sender?.username || "User";
}

/** Reactions metadata can arrive as an object or a JSON string. */
export function parseReactionsBlob(
  reactions: MessageMetadata["reactions"]
): Record<string, string[]> {
  let map: Record<string, unknown> = {};
  if (typeof reactions === "string") {
    try {
      const parsed = JSON.parse(reactions);
      if (parsed && typeof parsed === "object") map = parsed as Record<string, unknown>;
    } catch {
      // malformed reactions blob — ignore
    }
  } else if (reactions) {
    map = reactions;
  }
  return Object.fromEntries(
    Object.entries(map).filter(([, userIds]) => Array.isArray(userIds) && userIds.length > 0)
  ) as Record<string, string[]>;
}

export function parseMessageReactions(metadata: MessageItem["metadata"]): Record<string, string[]> {
  return parseReactionsBlob(metadata?.reactions);
}

export const QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥", "👏"];
export const EXTRA_REACTIONS = ["🎉", "💯", "👀", "🚀", "⚡", "🙏", "🤩", "💔"];