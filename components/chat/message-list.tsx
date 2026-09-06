"use client";

import { useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { MessageBubble, MessageItem } from "./message-bubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Marker, MarkerContent } from "@/components/ui/marker";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { Loader2, MessageSquare } from "lucide-react";
import { formatChatDateLabel } from "@/lib/messages";

interface MessageListProps {
  conversationId: string;
  currentUserId: string;
  messages: MessageItem[];
  hasMore: boolean;
  loadingMore: boolean;
  typingUsers?: string[];
  onLoadMore: () => void;
  onRetry: (msg: MessageItem) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (message: MessageItem) => void;
  onForward?: (message: MessageItem) => void;
  onDelete?: (messageId: string) => void;
}

/** Real-time typing indicator shown in the message stream. */
function TypingIndicator({ users }: { users: string[] }) {
  return (
    <div className="my-2 flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-150">
      <StatusIndicator status="connecting" size="sm" />
      <span>
        {users.join(", ")} {users.length > 1 ? "are" : "is"} typing
      </span>
      <span className="inline-flex items-center font-mono text-[11px] font-bold tracking-widest">
        <span className="animate-pulse duration-300">·</span>
        <span className="animate-pulse duration-500">·</span>
        <span className="animate-pulse duration-700">·</span>
      </span>
    </div>
  );
}

export function MessageList({
  conversationId,
  currentUserId,
  messages,
  hasMore,
  loadingMore,
  typingUsers = [],
  onLoadMore,
  onRetry,
  onReact,
  onReply,
  onForward,
  onDelete,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef<number>(0);
  const isInitialLoadRef = useRef<boolean>(true);
  const shouldAutoScrollRef = useRef<boolean>(true);

  // Group messages by date
  const groupedByDate = messages.reduce((acc, msg) => {
    const dateKey = new Date(msg.createdAt).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(msg);
    return acc;
  }, {} as Record<string, MessageItem[]>);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (container.scrollTop < 50 && hasMore && !loadingMore) {
      previousScrollHeightRef.current = container.scrollHeight;
      onLoadMore();
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 160;
  }, [hasMore, loadingMore, onLoadMore]);

  // Smooth / instant scroll to bottom
  const scrollToBottom = useCallback((smooth = false) => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }
  }, []);

  const handleMediaLoad = useCallback(() => {
    if (shouldAutoScrollRef.current) {
      scrollToBottom(true);
    }
  }, [scrollToBottom]);

  // Preserve scroll position when older messages are prepended
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (previousScrollHeightRef.current > 0) {
      const heightDifference = container.scrollHeight - previousScrollHeightRef.current;
      container.scrollTop += heightDifference;
      previousScrollHeightRef.current = 0;
    }
  }, [messages]);

  // Auto-scroll on content resize (e.g. GIFs loading, images expanding, stickers rendering)
  useEffect(() => {
    const contentEl = contentRef.current;
    if (!contentEl) return;

    const resizeObserver = new ResizeObserver(() => {
      if (isInitialLoadRef.current) {
        scrollToBottom(false);
        isInitialLoadRef.current = false;
      } else if (shouldAutoScrollRef.current) {
        scrollToBottom(true);
      }
    });

    resizeObserver.observe(contentEl);
    return () => resizeObserver.disconnect();
  }, [scrollToBottom]);

  // Scroll to bottom on conversation change, new messages, or typing
  useEffect(() => {
    if (isInitialLoadRef.current) {
      scrollToBottom(false);
      isInitialLoadRef.current = false;
    } else if (shouldAutoScrollRef.current) {
      scrollToBottom(true);
    }
  }, [messages, conversationId, typingUsers, scrollToBottom]);

  useEffect(() => {
    isInitialLoadRef.current = true;
    shouldAutoScrollRef.current = true;
  }, [conversationId]);

  return (
    <ScrollArea
      className="h-full min-h-0 flex-1 bg-card"
      viewportRef={containerRef}
      onScroll={handleScroll}
      viewportClassName="px-2 sm:px-4 py-4"
    >
      {/* Centered conversation reading column (780px max width, balanced insets) */}
      <div
        ref={contentRef}
        className="mx-auto flex min-h-full w-full max-w-[780px] flex-col px-3 sm:px-6"
      >
        {/* Top spacer so small message lists stay at bottom without breaking top scroll */}
        <div className="flex-1" />

        {/* Loading older messages indicator */}
        {loadingMore && (
          <div className="flex shrink-0 items-center justify-center gap-2 py-2.5 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            <span>Loading previous history...</span>
          </div>
        )}

        {/* Start of conversation banner */}
        {!hasMore && messages.length > 0 && (
          <Marker variant="separator" className="my-3 shrink-0">
            <MarkerContent className="text-[10px] font-mono tracking-widest text-muted-foreground/70 uppercase">
              Beginning of conversation
            </MarkerContent>
          </Marker>
        )}

        {/* Empty State */}
        {messages.length === 0 && !loadingMore && (
          <Empty className="flex-1 py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessageSquare className="size-4" />
              </EmptyMedia>
              <EmptyTitle>No messages yet</EmptyTitle>
              <EmptyDescription>
                Send a friendly greeting, photo, GIF or sticker to start chatting!
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {/* Messages grouped by date & clean sender clusters */}
        {Object.entries(groupedByDate).map(([date, msgs]) => {
          const dateLabel = formatChatDateLabel(msgs[0]?.createdAt || date);

          return (
            <div key={date} className="flex flex-col">
              {/* Date header */}
              <Marker variant="separator" className="my-3 shrink-0">
                <MarkerContent className="text-[11px] font-medium text-muted-foreground/80">
                  {dateLabel}
                </MarkerContent>
              </Marker>

              <div className="flex flex-col">
                {msgs.map((msg, idx) => {
                  const prevMsg = msgs[idx - 1];
                  const nextMsg = msgs[idx + 1];

                  const GROUP_GAP_MS = 2 * 60 * 1000;
                  const isDifferentSenderPrev = !prevMsg || prevMsg.senderId !== msg.senderId;
                  const isTimeGapPrev =
                    prevMsg &&
                    new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() >=
                      GROUP_GAP_MS;
                  const isFirstInGroup = isDifferentSenderPrev || isTimeGapPrev;

                  const isDifferentSenderNext = !nextMsg || nextMsg.senderId !== msg.senderId;
                  const isTimeGapNext =
                    nextMsg &&
                    new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime() >=
                      GROUP_GAP_MS;
                  const isLastInGroup = isDifferentSenderNext || isTimeGapNext;

                  return (
                    <MessageBubble
                      key={msg.clientMessageId || msg.id}
                      message={msg}
                      isCurrentUser={msg.senderId === currentUserId}
                      currentUserId={currentUserId}
                      isFirstInGroup={isFirstInGroup}
                      isLastInGroup={isLastInGroup}
                      onRetry={onRetry}
                      onMediaLoad={handleMediaLoad}
                      onReact={onReact}
                      onReply={onReply}
                      onForward={onForward}
                      onDelete={onDelete}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Real-Time In-Stream Typing Indicator */}
        {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}

        <div ref={bottomRef} className="h-px shrink-0" />
      </div>
    </ScrollArea>
  );
}