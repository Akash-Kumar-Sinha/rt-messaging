"use client";

import { useState } from "react";
import { Check, Send, Share2, Images, Film, Sparkles, MessageSquare } from "lucide-react";
import { ConversationSummary } from "./conversation-sidebar";
import { MessageItem } from "./message-bubble";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchInput } from "@/components/ui/search-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { initialsOf, avatarSeedUrl, getMessagePreview } from "@/lib/messages";

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: MessageItem | null;
  conversations: ConversationSummary[];
  onForward: (targetConversationId: string, message: MessageItem) => Promise<boolean>;
  onSelectConversation?: (conversationId: string) => void;
}

export function ForwardModal({
  isOpen,
  onClose,
  message,
  conversations,
  onForward,
  onSelectConversation,
}: ForwardModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);

  const filteredConversations = conversations.filter((c) => {
    const name = c.otherUser?.displayName || c.otherUser?.username || c.title || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSendForward = async (conv: ConversationSummary) => {
    if (sentMap[conv.id] || sendingId) return;

    setSendingId(conv.id);
    try {
      const success = await onForward(conv.id, message!);
      if (success) {
        setSentMap((prev) => ({ ...prev, [conv.id]: true }));
        const recipientName = conv.otherUser?.displayName || conv.otherUser?.username || "Chat";

        toast.add({
          title: "Message Forwarded",
          description: `Forwarded to ${recipientName}.`,
          type: "success",
        });

        // Close modal and navigate/open the forwarded conversation
        onClose();
        if (onSelectConversation) {
          onSelectConversation(conv.id);
        }
      }
    } catch (err) {
      console.error("Forward error:", err);
      toast.add({
        title: "Forward Failed",
        description: "Could not deliver forwarded message.",
        type: "error",
      });
    } finally {
      setSendingId(null);
    }
  };

  if (!message) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col border border-border/60 bg-card/95 p-0 shadow-2xl backdrop-blur-md sm:max-w-md">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <div className="flex size-7 items-center justify-center rounded-lg border border-border/40 bg-muted text-foreground">
              <Share2 className="size-3.5" />
            </div>
            Forward Message
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">Choose a conversation to forward this message to.</DialogDescription>
        </DialogHeader>

        {/* Message Preview Box */}
        <div className="border-y border-border/50 bg-muted/20 p-3">
          <span className="mb-1.5 block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Forwarding Content
          </span>

          <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-secondary/40 p-2.5">
            {message.type === "IMAGE" && message.media?.url && (
              <img
                src={message.media.url}
                alt="Media"
                className="size-11 shrink-0 rounded-lg border border-border/50 object-cover"
              />
            )}
            {message.type === "GIF" && (
              <img
                src={message.metadata?.url || message.metadata?.previewUrl}
                alt="GIF"
                className="size-11 shrink-0 rounded-lg border border-border/50 object-cover"
              />
            )}
            {message.type === "STICKER" && (
              <img
                src={message.metadata?.url}
                alt="Sticker"
                className="size-11 shrink-0 rounded-lg border border-border/50 bg-muted object-contain"
              />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                {message.type === "TEXT" && <MessageSquare className="size-3 text-muted-foreground" />}
                {message.type === "IMAGE" && <Images className="size-3 text-muted-foreground" />}
                {message.type === "GIF" && <Film className="size-3 text-muted-foreground" />}
                {message.type === "STICKER" && <Sparkles className="size-3 text-muted-foreground" />}
                <span className="text-[11px] font-semibold">
                  {message.sender?.displayName || message.sender?.username || "Original Sender"}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground/80">
                {getMessagePreview(message.type, message.content)}
              </p>
            </div>
          </div>
        </div>

        {/* Search Conversation Input */}
        <div className="border-b border-border/50 bg-background/50 p-3">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
            placeholder="Search conversations or friends..."
            className="[&>input]:bg-background/60 [&>input]:border-border/50"
          />
        </div>

        {/* Target Conversations List */}
        <ScrollArea className="max-h-[45vh] min-h-0 flex-1" viewportClassName="divide-y divide-border/40 p-2">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No matching conversations found
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSent = !!sentMap[conv.id];
              const isSending = sendingId === conv.id;
              const other = conv.otherUser;
              const displayName =
                other?.displayName || other?.username || conv.title || "Direct Chat";
              const avatar =
                other?.avatarUrl || avatarSeedUrl(other?.id || conv.id);

              return (
                <div
                  key={conv.id}
                  className="flex items-center justify-between gap-3 rounded-xl p-2.5 px-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar size="sm" className="shrink-0 border border-border/50">
                      <AvatarImage src={avatar} alt={displayName} />
                      <AvatarFallback className="text-[10px] font-medium">{initialsOf(displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h4 className="truncate text-xs font-semibold text-foreground">
                        {displayName}
                      </h4>
                      <p className="truncate text-[11px] text-muted-foreground/80">
                        @{other?.username || "chat"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSendForward(conv)}
                    disabled={isSent || isSending}
                    className={`flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-all ${
                      isSent
                        ? "border border-border/50 bg-secondary text-secondary-foreground"
                        : "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-95 disabled:opacity-50"
                    }`}
                  >
                    {isSent ? (
                      <>
                        <Check className="size-3" />
                        <span>Sent</span>
                      </>
                    ) : (
                      <>
                        <span>Send</span>
                        <Send className="size-3" />
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </ScrollArea>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 p-3">
          <span className="text-[11px] text-muted-foreground/80">
            {Object.keys(sentMap).length > 0
              ? `Forwarded to ${Object.keys(sentMap).length} chat(s)`
              : "Select recipient"}
          </span>
          <Button variant="secondary" size="xs" onClick={onClose} className="rounded-lg border border-border/50">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}