"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, Images, Shapes, SmilePlus, X, Loader2, Reply, AlertCircle } from "lucide-react";
import { GifPicker } from "./gif-picker";
import { StickerPicker } from "./sticker-picker";
import { EmojiPicker } from "./emoji-picker";
import { GifItem } from "@/lib/gifs";
import { StickerItem } from "@/lib/stickers";
import { MessageItem } from "./message-bubble";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CanvasRevealEffect } from "@/components/ui/canvas-reveal-effect";
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentActions,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import { ComposerAction } from "./composer-action";
import type { MessageMetadata } from "./message-types";

interface ChatInputProps {
  conversationId: string;
  onSendMessage: (payload: {
    type: "TEXT" | "IMAGE" | "GIF" | "STICKER";
    content?: string;
    mediaId?: string;
    metadata?: MessageMetadata;
  }) => void;
  replyingTo?: MessageItem | null;
  onCancelReply?: () => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  disabled?: boolean;
}

type PickerKind = "gif" | "sticker" | "emoji" | null;

/** Round send button shared between text and image sends. */
function SendButton({
  canSend,
  onClick,
}: {
  canSend: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            disabled={!canSend}
            aria-label="Send message"
            className={`flex size-[30px] items-center justify-center rounded-full transition-all duration-150 sm:size-8 ${
              canSend
                ? "cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                : "cursor-not-allowed bg-muted/40 text-muted-foreground/50 opacity-50"
            }`}
          />
        }
      >
        <ArrowUp className="size-4 stroke-[2.2]" />
      </TooltipTrigger>
      <TooltipContent side="top" align="end" sideOffset={6}>
        Send message (Enter)
      </TooltipContent>
    </Tooltip>
  );
}

export function ChatInput({
  conversationId,
  onSendMessage,
  replyingTo,
  onCancelReply,
  onTypingStart,
  onTypingStop,
  disabled = false,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [activePicker, setActivePicker] = useState<PickerKind>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [pendingMedia, setPendingMedia] = useState<{
    id: string;
    url: string;
    filename: string;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const errorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef<boolean>(false);

  const clearError = useCallback(() => {
    setComposerError(null);
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
  }, []);

  const showError = useCallback(
    (msg: string) => {
      setComposerError(msg);
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }
      errorTimerRef.current = setTimeout(() => {
        setComposerError(null);
        errorTimerRef.current = null;
      }, 4000);
    },
    []
  );

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  // Close active picker on click outside the composer surface
  const surfaceRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        activePicker &&
        surfaceRef.current &&
        !surfaceRef.current.contains(e.target as Node)
      ) {
        setActivePicker(null);
      }
    };
    if (activePicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activePicker]);

  const togglePicker = (kind: Exclude<PickerKind, null>) => {
    setActivePicker((prev) => (prev === kind ? null : kind));
  };

  // Focus textarea when replying
  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (composerError) {
      clearError();
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTypingStart();
    }

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTypingStop();
    }, 2000);
  };

  const handleSend = useCallback(() => {
    if (disabled || uploadingImage) return;
    clearError();

    if (pendingMedia) {
      onSendMessage({
        type: "IMAGE",
        content: text.trim() || undefined,
        mediaId: pendingMedia.id,
      });
      setPendingMedia(null);
      setText("");
    } else if (text.trim().length > 0) {
      onSendMessage({
        type: "TEXT",
        content: text.trim(),
      });
      setText("");
    } else {
      return;
    }

    if (isTypingRef.current) {
      isTypingRef.current = false;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      onTypingStop();
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  }, [disabled, uploadingImage, clearError, pendingMedia, text, onSendMessage, onTypingStop]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const uploadImageFile = useCallback(
    async (file: File) => {
      clearError();
      setUploadingImage(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("conversationId", conversationId);

        const res = await fetch("/api/media/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          const isFailed =
            data.code === "MODERATION_FAILED" ||
            data.status === "MODERATION_FAILED";
          const errorMessage = isFailed
            ? "Image could not be processed. Please try again."
            : "This image cannot be sent.";

          showError(errorMessage);
          return;
        }

        setPendingMedia({
          id: data.media.id,
          url: data.media.url,
          filename: file.name || "image.png",
        });
      } catch (err) {
        console.error("Upload error:", err);
        showError("Image could not be processed. Please try again.");
      } finally {
        setUploadingImage(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [conversationId, clearError, showError]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImageFile(file);
    }
  };

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            uploadImageFile(file);
            return;
          }
        }
      }
    },
    [uploadImageFile]
  );

  const handleSelectGif = (gif: GifItem) => {
    setActivePicker(null);
    onSendMessage({
      type: "GIF",
      metadata: {
        id: gif.id,
        title: gif.title,
        url: gif.url,
        previewUrl: gif.previewUrl,
        width: gif.width,
        height: gif.height,
        provider: gif.provider,
      },
    });
  };

  const handleSelectSticker = (sticker: StickerItem) => {
    setActivePicker(null);
    onSendMessage({
      type: "STICKER",
      metadata: {
        id: sticker.id,
        packId: sticker.packId,
        name: sticker.name,
        url: sticker.url,
        emoji: sticker.emoji,
      },
    });
  };

  const handleInsertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setActivePicker(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const canSend = Boolean(text.trim().length > 0 || pendingMedia) && !uploadingImage && !disabled;

  const replyPreview = replyingTo
    ? replyingTo.content ||
      (replyingTo.type === "IMAGE"
        ? "Photo"
        : replyingTo.type === "GIF"
        ? "GIF"
        : "Sticker")
    : "";

  return (
    <div ref={surfaceRef} className="relative w-full pt-1 pb-4 bg-transparent sm:pb-5">
      <div className="relative mx-auto w-full max-w-[780px] px-3 sm:px-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="relative flex flex-col rounded-2xl border border-border/60 bg-card p-2.5 px-3.5 shadow-md transition-all duration-150 focus-within:border-ring/60 focus-within:ring-1 focus-within:ring-ring/30 focus-within:shadow-lg sm:px-4">
          {replyingTo && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-secondary/80 px-2.5 py-1 text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-150">
              <div className="flex min-w-0 items-center gap-1.5">
                <Reply className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-[11px] font-medium text-foreground">
                  Replying to{" "}
                  <span className="font-semibold">
                    {replyingTo.sender?.displayName || replyingTo.sender?.username || "User"}
                  </span>
                  :
                </span>
                <span className="truncate text-[11px] text-muted-foreground">{replyPreview}</span>
              </div>
              <button
                onClick={onCancelReply}
                className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted-foreground/20 hover:text-foreground"
                title="Cancel reply"
                aria-label="Cancel reply"
              >
                <X className="size-3" />
              </button>
            </div>
          )}

          {uploadingImage && (
            <div className="relative mb-2 h-9 max-w-xs overflow-hidden rounded-lg border border-border/50 bg-muted/30 animate-in fade-in">
              <CanvasRevealEffect
                animationSpeed={0.8}
                containerClassName="bg-card"
                colors={[[100, 100, 110], [180, 180, 190]]}
                dotSize={2}
              />
              <div className="absolute inset-0 z-10 flex items-center gap-2 bg-background/60 px-2.5 text-xs font-medium text-foreground backdrop-blur-xs">
                <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
                <span>Scanning & uploading image...</span>
              </div>
            </div>
          )}

          {pendingMedia && !uploadingImage && (
            <div className="mb-2 inline-block max-w-xs animate-in fade-in">
              <Attachment state="done" size="sm">
                <AttachmentMedia variant="image">
                  <img src={pendingMedia.url} alt="Preview" className="size-full object-cover" />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{pendingMedia.filename}</AttachmentTitle>
                </AttachmentContent>
                <AttachmentActions>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setPendingMedia(null)}
                    title="Remove"
                  >
                    <X className="size-3.5" />
                  </Button>
                </AttachmentActions>
              </Attachment>
            </div>
          )}

          {composerError && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive animate-in fade-in slide-in-from-bottom-1 duration-150"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <AlertCircle className="size-3.5 shrink-0 text-destructive" />
                <span className="truncate text-xs font-medium">{composerError}</span>
              </div>
              <button
                type="button"
                onClick={clearError}
                aria-label="Dismiss"
                className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded text-destructive/70 transition-colors hover:bg-destructive/20 hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={disabled}
            rows={1}
            placeholder={
              uploadingImage
                ? "Scanning and uploading image..."
                : pendingMedia
                ? "Add a caption..."
                : "Type a message..."
            }
            className="max-h-28 min-h-[22px] w-full resize-none border-0 bg-transparent p-0 text-[13px] font-normal leading-relaxed text-foreground placeholder:text-muted-foreground selection:bg-muted focus:outline-none focus:ring-0 sm:text-sm"
          />

          <div className="mt-0.5 flex items-center justify-between pt-1">
            <div className="relative flex items-center gap-1 sm:gap-1.5">
              <ComposerAction
                label="Attach media"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || uploadingImage}
              >
                <Images className="size-[17px]" />
              </ComposerAction>

              <div className="relative">
                <ComposerAction
                  label="Search GIFs"
                  onClick={() => togglePicker("gif")}
                  disabled={disabled}
                  active={activePicker === "gif"}
                  className="h-7 px-1.5 text-[11px] font-bold tracking-wide leading-none"
                >
                  <span>GIF</span>
                </ComposerAction>
                {activePicker === "gif" && (
                  <GifPicker
                    onSelect={handleSelectGif}
                    onClose={() => setActivePicker(null)}
                  />
                )}
              </div>

              <div className="relative">
                <ComposerAction
                  label="Stickers"
                  onClick={() => togglePicker("sticker")}
                  disabled={disabled}
                  active={activePicker === "sticker"}
                >
                  <Shapes className="size-[17px]" />
                </ComposerAction>
                {activePicker === "sticker" && (
                  <StickerPicker
                    onSelect={handleSelectSticker}
                    onClose={() => setActivePicker(null)}
                  />
                )}
              </div>

              <div className="relative">
                <ComposerAction
                  label="Insert emoji"
                  onClick={() => togglePicker("emoji")}
                  disabled={disabled}
                  active={activePicker === "emoji"}
                >
                  <SmilePlus className="size-[17px]" />
                </ComposerAction>
                {activePicker === "emoji" && (
                  <EmojiPicker
                    onSelect={handleInsertEmoji}
                    onClose={() => setActivePicker(null)}
                  />
                )}
              </div>
            </div>

            <SendButton canSend={canSend} onClick={handleSend} />
          </div>
        </div>
      </div>
    </div>
  );
}