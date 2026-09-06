"use client";

import { ArrowLeft, Info, Search } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { ConversationSummary } from "./conversation-sidebar";
import { formatLastSeenLabel, initialsOf, avatarSeedUrl } from "@/lib/messages";

interface ChatHeaderProps {
  conversation?: ConversationSummary;
  conversationId?: string;
  typingUsers: string[];
  showInfoDrawer?: boolean;
  onBack: () => void;
  onOpenSearch: () => void;
  onToggleInfo: () => void;
}

/** Header for the active conversation: avatar, presence/typing state, actions. */
function ChatHeader({
  conversation,
  conversationId,
  typingUsers,
  showInfoDrawer = false,
  onBack,
  onOpenSearch,
  onToggleInfo,
}: ChatHeaderProps) {
  const other = conversation?.otherUser;
  const displayName =
    other?.displayName || other?.username || conversation?.title || "Direct Conversation";
  const avatar = other?.avatarUrl || avatarSeedUrl(conversationId || "chat");
  const isOnline = other?.isOnline || false;
  const isTyping = typingUsers.length > 0;
  
  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/40 bg-background/80 px-4 z-10 sm:px-5 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-2.5">
        {/* Mobile Back Button */}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onBack}
          title="Back to conversations"
          className="-ml-1 shrink-0 text-muted-foreground hover:text-foreground md:hidden"
        >
          <ArrowLeft className="size-4" />
        </Button>

        <div className="relative shrink-0">
          <Avatar className="size-9 border border-border/60">
            <AvatarImage src={avatar} alt={displayName} />
            <AvatarFallback className="text-[11px]">{initialsOf(displayName)}</AvatarFallback>
          </Avatar>
          {isOnline && (
            <StatusIndicator
              status="online"
              className="absolute right-0 bottom-0 border-2 border-background"
            />
          )}
        </div>

        <div className="flex min-w-0 flex-col justify-center">
          <h2 className="flex items-center gap-2 truncate text-xs font-semibold leading-tight text-foreground sm:text-sm">
            <span className="truncate">{displayName}</span>
          </h2>

          <div className="mt-0.5 flex items-center text-[11px] leading-none">
            {isTyping ? (
              <span className="flex items-center gap-1 font-medium text-primary">
                <StatusIndicator status="online" size="sm" />
                <span>typing</span>
                <span className="inline-flex items-center font-mono text-[11px] font-bold tracking-widest">
                  <span className="animate-pulse duration-300">·</span>
                  <span className="animate-pulse duration-500">·</span>
                  <span className="animate-pulse duration-700">·</span>
                </span>
              </span>
            ) : isOnline ? (
              <span className="flex items-center gap-1 font-medium text-primary">
                <StatusIndicator status="online" size="sm" />
                Active now
              </span>
            ) : (
              <span className="font-normal text-muted-foreground/60">
                {formatLastSeenLabel(other?.lastSeenAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        <IconButton
          label="Search conversation (⌘K)"
          size="icon-sm"
          onClick={onOpenSearch}
          className="size-7.5 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <Search className="size-3.5" />
        </IconButton>

        <IconButton
          label="Conversation details"
          size="icon-sm"
          active={showInfoDrawer}
          onClick={onToggleInfo}
          className="size-7.5 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <Info className="size-3.5" />
        </IconButton>
      </div>
    </div>
  );
}

export { ChatHeader }