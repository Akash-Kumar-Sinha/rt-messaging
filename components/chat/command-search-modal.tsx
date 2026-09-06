"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Users, ArrowRight, X, type LucideIcon } from "lucide-react";
import { ConversationSummary } from "./conversation-sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { initialsOf, avatarSeedUrl, getMessagePreview } from "@/lib/messages";

interface CommandSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: ConversationSummary[];
  onSelectConversation: (conversationId: string) => void;
  onOpenNewChat?: () => void;
}

export function CommandSearchModal({
  isOpen,
  onClose,
  conversations,
  onSelectConversation,
  onOpenNewChat,
}: CommandSearchModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global shortcut handler (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const name = c.otherUser?.displayName || c.otherUser?.username || c.title || "";
    const lastMsg = c.lastMessage?.content || "";
    return (
      name.toLowerCase().includes(query.toLowerCase()) ||
      lastMsg.toLowerCase().includes(query.toLowerCase())
    );
  });

  const actions = onOpenNewChat
    ? [
        {
          id: "action-new-chat",
          type: "ACTION" as const,
          title: "Start new conversation",
          subtitle: "Find registered users to chat with",
          icon: Users,
          action: () => {
            onClose();
            onOpenNewChat();
          },
        },
      ]
    : [];

  type CommandItem =
    | { id: string; type: "CONVERSATION"; conv: ConversationSummary }
    | { id: string; type: "ACTION"; title: string; subtitle: string; icon: LucideIcon; action: () => void };

  const allItems: CommandItem[] = [
    ...filteredConversations.map(
      (c): CommandItem => ({
        id: c.id,
        type: "CONVERSATION",
        conv: c,
      })
    ),
    ...actions.map(
      (a): CommandItem => ({
        ...a,
        type: "ACTION",
      })
    ),
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % Math.max(1, allItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = allItems[selectedIndex];
      if (current) {
        if (current.type === "CONVERSATION") {
          onSelectConversation(current.conv.id);
          onClose();
        } else if (current.type === "ACTION") {
          current.action();
        }
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="top-[15vh] max-h-[75vh] flex-col gap-0 overflow-hidden border border-border/60 bg-card/95 p-0 shadow-2xl backdrop-blur-md -translate-y-0 sm:max-w-xl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search conversations</DialogTitle>
        </DialogHeader>

        {/* Top Search Input */}
        <div className="flex items-center gap-3 border-b border-border/50 bg-background/50 p-3.5 px-4">
          <Search className="size-4.5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search messages, people, files..."
            className="w-full bg-transparent text-sm font-normal text-foreground selection:bg-muted placeholder:text-muted-foreground focus:outline-none focus:ring-0"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <kbd className="rounded border border-border/50 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shadow-xs">
              ESC
            </kbd>
          )}
        </div>

        {/* Results Body */}
        <ScrollArea className="max-h-[55vh] min-h-0 flex-1" viewportClassName="p-2">
          {/* Recent Conversations Group */}
          {filteredConversations.length > 0 ? (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                {query ? "Conversations" : "Recent"}
              </div>
              <div className="mt-1 flex flex-col gap-0.5">
                {filteredConversations.map((conv, idx) => {
                  const isSelected = selectedIndex === idx;
                  const other = conv.otherUser;
                  const displayName =
                    other?.displayName || other?.username || conv.title || "Direct Chat";
                  const avatar =
                    other?.avatarUrl || avatarSeedUrl(other?.id || conv.id);
                  const isOnline = other?.isOnline || false;

                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => {
                        onSelectConversation(conv.id);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-xl p-2.5 px-3 text-left transition-colors ${
                        isSelected
                          ? "bg-secondary text-foreground shadow-xs font-medium"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative shrink-0">
                          <Avatar size="sm" className="border border-border/50">
                            <AvatarImage src={avatar} alt={displayName} />
                            <AvatarFallback className="text-[10px] font-medium">{initialsOf(displayName)}</AvatarFallback>
                          </Avatar>
                          {isOnline && (
                            <StatusIndicator
                              status="online"
                              className="absolute right-0 bottom-0 border-2 border-card"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-xs font-semibold text-foreground">
                              {displayName}
                            </span>
                            {isOnline && (
                              <span className="flex items-center gap-0.5 text-[10px] font-medium text-primary">
                                <StatusIndicator status="online" size="sm" />
                                Online
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground/80">
                            {conv.lastMessage
                              ? getMessagePreview(conv.lastMessage.type, conv.lastMessage.content)
                              : "Start the conversation..."}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {conv.unreadCount > 0 && (
                          <span className="rounded-md border border-border/50 bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                            {conv.unreadCount} new
                          </span>
                        )}
                        <ArrowRight
                          className={`size-3.5 transition-opacity ${
                            isSelected ? "text-foreground opacity-100" : "opacity-0"
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : query ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No conversations matching &ldquo;{query}&rdquo;
            </div>
          ) : null}

          {/* Quick Actions Group */}
          {actions.length > 0 && (
            <div className="mt-2">
              <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Quick Actions
              </div>
              <div className="mt-1 flex flex-col gap-0.5">
                {actions.map((act, actIdx) => {
                  const globalIdx = filteredConversations.length + actIdx;
                  const isSelected = selectedIndex === globalIdx;
                  const Icon = act.icon;

                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={act.action}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-xl p-2.5 px-3 text-left transition-colors ${
                        isSelected
                          ? "bg-secondary text-foreground shadow-xs font-medium"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${
                            isSelected
                              ? "border-border/60 bg-primary text-primary-foreground shadow-xs"
                              : "border-border/40 bg-muted/60 text-muted-foreground"
                          }`}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-foreground">
                            {act.title}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground/80">
                            {act.subtitle}
                          </span>
                        </div>
                      </div>

                      <ArrowRight
                        className={`size-3.5 transition-opacity ${
                          isSelected ? "text-foreground opacity-100" : "opacity-0"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer Shortcut Hints */}
        <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 p-2.5 px-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border/50 bg-muted/60 px-1 py-0.5 font-mono text-[10px]">
                ↑
              </kbd>
              <kbd className="rounded border border-border/50 bg-muted/60 px-1 py-0.5 font-mono text-[10px]">
                ↓
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border/50 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px]">
                ↵
              </kbd>
              Open
            </span>
          </div>
          <span className="text-[10px] tracking-wide text-muted-foreground/70">SignalPulse Search</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}