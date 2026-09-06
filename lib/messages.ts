export function getMessagePreview(type: string, content?: string | null): string {
  if (type === "IMAGE") return "Photo";
  if (type === "GIF") return "GIF";
  if (type === "STICKER") return "Sticker";
  return content || "";
}

export function getMessageCopyText(
  type: string,
  content: string | null | undefined,
  mediaUrl?: string | null,
  metadataUrl?: string | null
): string {
  if (type === "TEXT") return content || "";
  if (type === "IMAGE") {
    if (mediaUrl) {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      return origin + mediaUrl;
    }
    return content || "Photo";
  }
  if (type === "GIF") {
    return metadataUrl || mediaUrl || content || "GIF";
  }
  if (type === "STICKER") {
    return metadataUrl || mediaUrl || content || "Sticker";
  }
  return content || "";
}

export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatChatDateLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) return "Today";

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return "Yesterday";

  const isCurrentYear = date.getFullYear() === now.getFullYear();
  if (isCurrentYear) {
    return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function formatLastSeenLabel(lastSeenAt?: string | null): string {
  if (!lastSeenAt) return "Offline";
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  if (isNaN(diffMs)) return "Offline";
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "Last seen just now";
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Last seen yesterday";
  if (days < 7) return `Last seen ${days}d ago`;
  return `Last seen ${new Date(lastSeenAt).toLocaleDateString([], { month: "short", day: "numeric" })}`;
}

export function initialsOf(name: string): string {
  return name.substring(0, 2).toUpperCase();
}

export function avatarSeedUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
}

/**
 * Checks if a string consists strictly of emoji characters and whitespace.
 * Returns true for "😂" or "😂 ❤️ 🔥", false for "That was 😂" or "hello".
 */
export function isEmojiOnlyMessage(content: string | null | undefined): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  if (!trimmed) return false;

  // If it contains normal letters or digits, it's not emoji-only
  if (/[a-zA-Z0-9]/.test(trimmed)) return false;

  // Unicode regex matching Emoji pictographic symbols and modifiers
  const emojiOnlyRegex = /^[\s\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji_Modifier_Base}\p{Emoji_Component}\u200d\ufe0e\ufe0f]+$/u;
  return emojiOnlyRegex.test(trimmed);
}