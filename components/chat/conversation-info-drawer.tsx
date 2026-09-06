"use client";

import { useState } from "react";
import { X, Search } from "lucide-react";
import { ConversationSummary } from "./conversation-sidebar";
import { MessageItem } from "./message-bubble";
import { ImageLightbox } from "./image-lightbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { initialsOf, avatarSeedUrl } from "@/lib/messages";

export interface ConversationInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversation?: ConversationSummary;
  messages: MessageItem[];
  onOpenSearch?: () => void;
}

/** Profile section at top of details drawer */
export function ConversationProfile({
  displayName,
  username,
  avatar,
  isOnline,
}: {
  displayName: string;
  username: string;
  avatar: string;
  isOnline: boolean;
}) {
  return (
    <div className="flex flex-col items-center pt-1 text-center">
      <div className="relative mb-2.5">
        <Avatar size="lg" className="size-16 border border-border">
          <AvatarImage src={avatar} alt={displayName} />
          <AvatarFallback className="text-sm font-medium">
            {initialsOf(displayName)}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <StatusIndicator
            status="online"
            size="md"
            className="absolute right-0.5 bottom-0.5 ring-2 ring-background"
          />
        )}
      </div>

      <h2 className="text-sm font-semibold text-foreground">{displayName}</h2>
      <p className="mt-0.5 font-mono text-xs text-muted-foreground">@{username}</p>

      <div className="mt-2 flex items-center gap-1.5 text-xs">
        {isOnline ? (
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <StatusIndicator status="online" size="sm" />
            Active now
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <StatusIndicator status="offline" size="sm" />
            Offline
          </span>
        )}
      </div>
    </div>
  );
}

/** Compact search button within conversation */
export function ConversationSearch({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
    >
      <Search className="size-3.5" />
      <span>Search in conversation</span>
    </button>
  );
}

/** Media gallery section */
export function MediaAttachments({
  mediaItems,
  onSelectImage,
}: {
  mediaItems: MessageItem[];
  onSelectImage: (src: string) => void;
}) {
  const countLabel =
    mediaItems.length === 1 ? "1 item" : `${mediaItems.length} items`;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold tracking-wider text-muted-foreground uppercase select-none">
          Media & Attachments
        </span>
        {mediaItems.length > 0 && (
          <span className="font-mono text-[11px] text-muted-foreground">{countLabel}</span>
        )}
      </div>

      {mediaItems.length === 0 ? (
        <div className="rounded-lg border border-border/50 bg-muted/10 p-3 text-center text-xs text-muted-foreground">
          No shared media
        </div>
      ) : mediaItems.length === 1 ? (
        <div className="w-28">
          {(() => {
            const item = mediaItems[0];
            const src = item.media?.url || item.metadata?.previewUrl || item.metadata?.url;
            if (!src) return null;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectImage(src)}
                className="group/thumb relative aspect-square w-full cursor-pointer overflow-hidden rounded-lg border border-border bg-secondary/30 transition-all hover:border-foreground/40 focus:outline-hidden focus:ring-1 focus:ring-ring"
                title="Click to view image"
              >
                <img
                  src={src}
                  alt={item.media?.originalFilename || "Media thumbnail"}
                  className="size-full object-cover transition-transform duration-200 group-hover/thumb:scale-105"
                  loading="lazy"
                />
                {item.type === "GIF" && (
                  <span className="absolute right-1 bottom-1 rounded bg-background/80 px-1 text-[8px] font-bold text-foreground">
                    GIF
                  </span>
                )}
              </button>
            );
          })()}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {mediaItems.slice(0, 18).map((item) => {
            const src = item.media?.url || item.metadata?.previewUrl || item.metadata?.url;
            if (!src) return null;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectImage(src)}
                className="group/thumb relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-border bg-secondary/30 transition-all hover:border-foreground/40 focus:outline-hidden focus:ring-1 focus:ring-ring"
                title="Click to view image"
              >
                <img
                  src={src}
                  alt={item.media?.originalFilename || "Media thumbnail"}
                  className="size-full object-cover transition-transform duration-200 group-hover/thumb:scale-105"
                  loading="lazy"
                />
                {item.type === "GIF" && (
                  <span className="absolute right-1 bottom-1 rounded bg-background/80 px-1 text-[8px] font-bold text-foreground">
                    GIF
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** About / metadata section */
export function ConversationAbout({ createdAt }: { createdAt: string }) {
  const formattedDate = new Date(createdAt).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-1.5">
      <span className="block text-[11px] font-semibold tracking-wider text-muted-foreground uppercase select-none">
        About
      </span>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Created</span>
        <span className="font-mono text-muted-foreground">{formattedDate}</span>
      </div>
    </div>
  );
}

export function ConversationInfoDrawer({
  isOpen,
  onClose,
  conversation,
  messages,
  onOpenSearch,
}: ConversationInfoDrawerProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (!isOpen || !conversation) return null;

  const other = conversation.otherUser;
  const displayName =
    other?.displayName || other?.username || conversation.title || "Direct Conversation";
  const username = other?.username || "user";
  const avatar =
    other?.avatarUrl || avatarSeedUrl(other?.id || conversation.id);
  const isOnline = other?.isOnline || false;

  // Extract all media items from messages
  const mediaItems = messages.filter(
    (m) =>
      (m.type === "IMAGE" && m.media?.url) ||
      (m.type === "GIF" && (m.metadata?.url || m.metadata?.previewUrl))
  );

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex h-full w-72 shrink-0 flex-col border-l border-border bg-background shadow-xl duration-200 animate-in slide-in-from-right sm:relative sm:z-20 sm:shadow-none lg:w-80">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Conversation Details
        </h3>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          className="size-7 cursor-pointer rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Close details"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {/* Profile */}
        <ConversationProfile
          displayName={displayName}
          username={username}
          avatar={avatar}
          isOnline={isOnline}
        />

        {/* Search in Conversation */}
        <ConversationSearch onClick={onOpenSearch} />

        {/* Media & Attachments */}
        <MediaAttachments
          mediaItems={mediaItems}
          onSelectImage={setPreviewImage}
        />

        {/* About */}
        <ConversationAbout createdAt={conversation.updatedAt} />
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        src={previewImage}
      />
    </aside>
  );
}

// Reusable export alias
export { ConversationInfoDrawer as ConversationDetails };
