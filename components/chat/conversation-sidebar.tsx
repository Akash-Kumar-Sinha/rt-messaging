"use client";

import { useState, useEffect } from "react";
import { Plus, Users, Search } from "lucide-react";
import { SessionUser } from "@/lib/auth";
import { IconButton } from "@/components/ui/icon-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { ConversationItem } from "./conversation-item";
import { CommandSearchModal } from "./command-search-modal";
import { NewChatModal } from "./new-chat-modal";
import type { SearchedUser } from "./user-search";

export interface ConversationSummary {
  id: string;
  type: "DIRECT" | "GROUP";
  title?: string | null;
  unreadCount: number;
  lastReadAt: string;
  otherUser?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    lastSeenAt?: string | null;
    isOnline: boolean;
  } | null;
  participants: Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    lastSeenAt?: string | null;
    isOnline: boolean;
  }>;
  lastMessage?: {
    id: string;
    content?: string | null;
    type: string;
    senderId: string;
    createdAt: string;
    status: string;
  } | null;
  updatedAt: string;
}

interface ConversationSidebarProps {
  currentUser: SessionUser;
  conversations: ConversationSummary[];
  activeConversationId?: string | null;
  onSelectConversation: (conversationId: string) => void;
  onConversationCreated: (conversation: { id: string }) => void;
  socketEmit?: (event: string, data: any) => void;
}

export function ConversationSidebar({
  currentUser,
  conversations,
  activeConversationId,
  onSelectConversation,
  onConversationCreated,
  socketEmit,
}: ConversationSidebarProps) {
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleOpenNewChat = () => {
    setShowNewChatModal(true);
  };

  const handleStartChatWithUser = async (user: SearchedUser) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: user.id }),
      });
      const data = await res.json();
      if (data.conversation) {
        onConversationCreated(data.conversation);
        onSelectConversation(data.conversation.id);
        setShowNewChatModal(false);

        if (socketEmit) {
          socketEmit("conversation:create", {
            conversationId: data.conversation.id,
            recipientId: user.id,
          });
        }
      }
    } catch (err) {
      console.error("Failed to start chat:", err);
    }
  };

  return (
    <>
      <div className="flex h-full w-full shrink-0 flex-col bg-card/40 md:w-72 lg:w-80">
        {/* Sidebar Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/40 px-3.5 sm:px-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
            Messages
          </h2>

          <IconButton
            label="New Conversation"
            size="icon-xs"
            onClick={handleOpenNewChat}
            className="size-7 rounded-lg border border-border/50 bg-background/50 text-muted-foreground hover:bg-muted/60 hover:text-foreground shadow-2xs"
          >
            <Plus className="size-3.5" />
          </IconButton>
        </div>

        {/* Search trigger (opens command palette) */}
        <div className="p-2.5 pb-1.5">
          <button
            type="button"
            onClick={() => setShowCommandPalette(true)}
            className="group flex w-full cursor-pointer items-center justify-between rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 text-xs text-muted-foreground shadow-2xs transition-all hover:border-border/80 hover:bg-background/80 hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <Search className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
              <span className="text-xs font-normal">Search</span>
            </span>
            <kbd className="inline-flex shrink-0 items-center gap-0.5 rounded border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shadow-2xs">
              ⌘ K
            </kbd>
          </button>
        </div>

        {/* Recent Section Label */}
        <div className="flex items-center justify-between px-3.5 pt-2 pb-1">
          <span className="text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase select-none">
            Recent
          </span>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1 px-1.5 py-1">
          {conversations.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users className="size-4" />
                </EmptyMedia>
                <EmptyTitle>No chats found</EmptyTitle>
                <EmptyDescription>
                  Click the + button above to start a conversation!
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-0.5">
              {conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  active={activeConversationId === conv.id}
                  onSelect={onSelectConversation}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* New Conversation Modal (Username Search Based) */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onSelectUser={handleStartChatWithUser}
        excludeExisting={true}
      />

      {/* Global Command Palette Search Modal */}
      <CommandSearchModal
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        conversations={conversations}
        onSelectConversation={onSelectConversation}
        onOpenNewChat={handleOpenNewChat}
      />
    </>
  );
}