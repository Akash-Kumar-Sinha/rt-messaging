"use client";

import { cn } from "cn";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { ConversationSummary } from "./conversation-sidebar";
import { getMessagePreview, formatMessageTime, initialsOf, avatarSeedUrl } from "@/lib/messages";

interface ConversationItemProps {
  conversation: ConversationSummary;
  active?: boolean;
  onSelect: (conversationId: string) => void;
  className?: string;
}

/** Single conversation row in the sidebar list. */
function ConversationItem({
  conversation,
  active = false,
  onSelect,
  className,
}: ConversationItemProps) {
  const other = conversation.otherUser;
  const displayName = other?.displayName || other?.username || conversation.title || "Direct Chat";
  const avatar =
    other?.avatarUrl || avatarSeedUrl(other?.id || conversation.id);
  const isOnline = other?.isOnline || false;
  const lastTime = conversation.lastMessage?.createdAt
    ? formatMessageTime(conversation.lastMessage.createdAt)
    : "";

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      aria-current={active || undefined}
      className={cn(
        "relative flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors duration-150",
        active
          ? "bg-secondary text-foreground shadow-xs font-medium"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        className
      )}
    >
      {/* Avatar with live presence dot */}
      <div className="relative shrink-0">
        <Avatar className="size-8 border border-border/50">
          <AvatarImage src={avatar} alt={displayName} />
          <AvatarFallback className="text-[11px] font-medium">{initialsOf(displayName)}</AvatarFallback>
        </Avatar>
        {isOnline && (
          <StatusIndicator
            status="online"
            className="absolute right-0 bottom-0 border-2 border-card"
          />
        )}
      </div>

      {/* Conversation details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <h4 className={cn("truncate text-xs font-semibold", active ? "text-foreground" : "text-foreground/90")}>
            {displayName}
          </h4>
          {lastTime && (
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70">{lastTime}</span>
          )}
        </div>

        <div className="mt-0.5 flex items-center justify-between gap-1">
          <p className="truncate pr-1 text-[11px] text-muted-foreground/80">
            {conversation.lastMessage
              ? getMessagePreview(conversation.lastMessage.type, conversation.lastMessage.content)
              : "Start the conversation..."}
          </p>

          {conversation.unreadCount > 0 && (
            <Badge variant="secondary" className="shrink-0 rounded-full border border-border/40 bg-accent px-1.5 py-0.5 text-[10px] text-foreground">
              {conversation.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

export { ConversationItem }