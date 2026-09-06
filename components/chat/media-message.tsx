"use client"

import { Loader2 } from "lucide-react"
import { cn } from "cn"
import { Badge } from "@/components/ui/badge"
import { CanvasRevealEffect } from "@/components/ui/canvas-reveal-effect"
import type { MessageItem } from "./message-types"

type MediaMessageProps = {
  message: MessageItem
  isCurrentUser?: boolean
  onMediaLoad?: () => void
  onOpenImage?: (src: string) => void
}

function MediaLoading({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-hidden">
      <CanvasRevealEffect
        animationSpeed={0.5}
        containerClassName="bg-card"
        colors={[[100, 100, 110], [180, 180, 190]]}
        dotSize={2}
      />
      <div className="absolute z-20 flex items-center gap-2 rounded-full border border-border/60 bg-background/85 px-3 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur-md">
        <Loader2 className="size-3.5 animate-spin text-primary" />
        <span>{label}</span>
      </div>
    </div>
  )
}

function MediaImage({
  message,
  onMediaLoad,
  onOpenImage,
}: Omit<MediaMessageProps, "isCurrentUser"> & { onOpenImage?: (src: string) => void }) {
  const mediaUrl = message.media?.url

  return (
    <div
      onClick={() => mediaUrl && onOpenImage?.(mediaUrl)}
      className="group/img relative flex min-h-36 min-w-48 max-h-96 max-w-md cursor-pointer items-center justify-center overflow-hidden rounded-[13px] border border-border/50 bg-secondary/40 shadow-xs"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" && mediaUrl) onOpenImage?.(mediaUrl)
      }}
    >
      {(!mediaUrl || message.status === "PENDING") && (
        <MediaLoading label={message.status === "PENDING" ? "Sending..." : "Loading..."} />
      )}

      {mediaUrl && (
        <img
          src={mediaUrl}
          alt={message.media?.originalFilename || "Attached media"}
          loading="eager"
          onLoad={onMediaLoad}
          className="h-auto max-h-96 w-full rounded-[13px] object-contain transition-all duration-300 group-hover/img:scale-[1.01]"
        />
      )}
    </div>
  )
}

function MediaGif({ message, onMediaLoad }: Omit<MediaMessageProps, "isCurrentUser" | "onOpenImage">) {
  const src = message.metadata?.url || message.metadata?.previewUrl

  return (
    <div className="relative min-h-[120px] max-w-sm overflow-hidden rounded-[13px] border border-border/50 bg-secondary/40 shadow-xs">
      {src ? (
        <img
          src={src}
          alt={message.metadata?.title || "GIF"}
          loading="eager"
          onLoad={onMediaLoad}
          className="max-h-72 w-full rounded-[13px] object-cover"
        />
      ) : (
        <MediaLoading label="Loading..." />
      )}
      <Badge
        variant="secondary"
        className="absolute right-2 bottom-2 border-none bg-background/80 px-1.5 py-0.5 text-[9px] text-foreground backdrop-blur-xs"
      >
        GIF
      </Badge>
    </div>
  )
}

function MediaSticker({ message, onMediaLoad }: Omit<MediaMessageProps, "isCurrentUser" | "onOpenImage">) {
  const src = message.metadata?.url

  return (
    <div className={cn("p-1 transition-transform duration-200 hover:scale-105")}>
      {src ? (
        <img
          src={src}
          alt={message.metadata?.name || "Sticker"}
          className="size-32 object-contain"
          loading="eager"
          onLoad={onMediaLoad}
        />
      ) : (
        <MediaLoading label="Loading..." />
      )}
    </div>
  )
}

function MediaMessage({ message, isCurrentUser = false, onMediaLoad, onOpenImage }: MediaMessageProps) {
  if (message.type === "GIF") return <MediaGif message={message} onMediaLoad={onMediaLoad} />
  if (message.type === "STICKER")
    return <MediaSticker message={message} onMediaLoad={onMediaLoad} />

  return (
    <div className={cn("flex flex-col gap-1", isCurrentUser && "items-end")}>
      <MediaImage message={message} onMediaLoad={onMediaLoad} onOpenImage={onOpenImage} />
      {message.content && (
        <p className="mt-0.5 px-1 text-xs text-foreground whitespace-pre-wrap break-words">
          {message.content}
        </p>
      )}
    </div>
  )
}

export { MediaMessage }