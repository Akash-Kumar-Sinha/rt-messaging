"use client"

import { useState } from "react"
import { Share2 } from "lucide-react"
import { cn } from "cn"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { ImageLightbox } from "./image-lightbox"
import { MessageReply } from "./message-reply"
import { MessageStatus } from "./message-status"
import { MessageReactions } from "./message-reactions"
import { MediaMessage } from "./media-message"
import { MessageActions } from "./message-actions"
import {
  type MessageItem,
  getMessageSenderName,
  parseMessageReactions,
} from "./message-types"
import {
  getMessageCopyText,
  formatMessageTime,
  initialsOf,
  avatarSeedUrl,
  isEmojiOnlyMessage,
} from "@/lib/messages"

import { FailedMessageCard } from "./failed-message-card"

export type { MessageItem }

type MessageBubbleProps = {
  message: MessageItem
  isCurrentUser: boolean
  currentUserId?: string
  isFirstInGroup?: boolean
  isLastInGroup?: boolean
  onRetry?: (message: MessageItem) => void
  onMediaLoad?: () => void
  onReact?: (messageId: string, emoji: string) => void
  onReply?: (message: MessageItem) => void
  onForward?: (message: MessageItem) => void
  onDelete?: (messageId: string) => void
}

function MessageBubble({
  message,
  isCurrentUser,
  currentUserId,
  isFirstInGroup = true,
  isLastInGroup = true,
  onRetry,
  onMediaLoad,
  onReact,
  onReply,
  onForward,
  onDelete,
}: MessageBubbleProps) {
  const [imageModalOpen, setImageModalOpen] = useState(false)

  const displayName = getMessageSenderName(message)
  const avatarUrl = message.sender?.avatarUrl || avatarSeedUrl(message.senderId)
  const reactions = parseMessageReactions(message.metadata)
  const formattedTime = formatMessageTime(message.createdAt)
  const isFailedModeration =
    message.status === "FAILED" &&
    (message.failureReason === "PROFANITY_REJECTED" ||
      message.failureReason === "MODERATION_FAILED")
  const canAct = message.status !== "PENDING" && message.status !== "FAILED"
  const isEmojiOnly = message.type === "TEXT" && isEmojiOnlyMessage(message.content)

  const handleCopy = () => {
    const copyText = getMessageCopyText(
      message.type,
      message.content,
      message.media?.url,
      message.metadata?.url || message.metadata?.previewUrl
    )
    if (copyText) {
      navigator.clipboard.writeText(copyText)
    }
  }

  const handleForward = () => {
    if (onForward) {
      onForward(message)
      return
    }
    let shareText = ""
    if (message.type === "TEXT" && message.content) {
      shareText = message.content
    } else if (message.media?.url) {
      shareText = window.location.origin + message.media.url
    } else if (message.metadata?.url) {
      shareText = message.metadata.url
    }
    if (navigator.share && shareText) {
      navigator.share({ title: "Forward Message", text: shareText }).catch(() => {})
    } else {
      navigator.clipboard.writeText(shareText || window.location.href)
    }
  }

  const handleSelectReaction = (emoji: string) => {
    onReact?.(message.id, emoji)
  }

  const forwardedBadge =
    !isFailedModeration && message.metadata?.isForwarded ? (
      <div className="mb-0.5 flex items-center gap-1 text-[10px] font-medium italic text-muted-foreground">
        <Share2 className="size-2.5 opacity-80" aria-hidden="true" />
        <span>Forwarded</span>
      </div>
    ) : null

  const replyQuote =
    !isFailedModeration && message.metadata?.replyTo ? (
      <MessageReply replyTo={message.metadata.replyTo} isCurrentUser={isCurrentUser} />
    ) : null

  const body = isFailedModeration ? (
    <FailedMessageCard reason={message.failureReason} />
  ) : message.type === "TEXT" ? (
    isEmojiOnly ? (
      <div
        className={cn(
          "w-fit max-w-full select-text py-0.5 text-3xl leading-snug sm:text-4xl",
          isCurrentUser ? "self-end text-right" : "self-start text-left"
        )}
      >
        {message.content}
      </div>
    ) : (
      <Bubble
        variant={
          message.status === "FAILED"
            ? "destructive"
            : isCurrentUser
            ? "outgoing"
            : "secondary"
        }
        align={isCurrentUser ? "end" : "start"}
        className="max-w-full"
      >
        <BubbleContent>{message.content}</BubbleContent>
      </Bubble>
    )
  ) : (
    <MediaMessage
      message={message}
      isCurrentUser={isCurrentUser}
      onMediaLoad={onMediaLoad}
      onOpenImage={() => setImageModalOpen(true)}
    />
  )

  const timestampAndStatus = isCurrentUser ? (
    <div className="flex items-center gap-1 px-0.5 text-[10px] leading-none text-muted-foreground select-none">
      <span>{formattedTime}</span>
      {(isLastInGroup || message.status === "FAILED" || message.status === "PENDING") && (
        <MessageStatus
          status={message.status}
          errorReason={message.errorReason}
          failureReason={message.failureReason}
          onRetry={onRetry}
          message={message}
        />
      )}
    </div>
  ) : isLastInGroup ? (
    <span className="px-0.5 text-[10px] leading-none text-muted-foreground select-none">
      {formattedTime}
    </span>
  ) : null

  if (!isCurrentUser) {
    return (
      <>
        <div
          id={`msg-${message.id}`}
          data-message-id={message.id}
          data-client-id={message.clientMessageId}
          className={cn(
            "relative flex w-full justify-start transition-all duration-150",
            isFirstInGroup ? "mt-2.5 sm:mt-3" : "mt-0.5",
            isLastInGroup ? "mb-1 sm:mb-1.5" : "mb-0.5"
          )}
        >
          <div className="flex max-w-[85%] items-start gap-2 sm:max-w-[70%]">
            {/* Avatar only on first message of sender group */}
            {isFirstInGroup ? (
              <Avatar size="sm" className="mt-0.5 size-6.5 shrink-0 border border-border/50">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="text-[10px]">{initialsOf(displayName)}</AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-6.5 shrink-0" aria-hidden="true" />
            )}

            <div className="group/msg relative flex min-w-0 max-w-full flex-col items-start">
              {isFirstInGroup && (
                <span className="mb-0.5 text-[11px] leading-none font-semibold text-foreground/90 select-none">
                  {displayName}
                </span>
              )}

              {forwardedBadge}
              {replyQuote}
              {body}

              <MessageReactions
                reactions={reactions}
                currentUserId={currentUserId}
                messageId={message.id}
                onReact={onReact}
              />

              {timestampAndStatus}

              <MessageActions
                isCurrentUser={false}
                canAct={canAct}
                onReact={handleSelectReaction}
                onReply={() => onReply?.(message)}
                onCopy={handleCopy}
                onForward={handleForward}
                onDelete={onDelete ? () => onDelete(message.id) : undefined}
                position="left"
              />
            </div>
          </div>
        </div>

        <ImageLightbox
          isOpen={imageModalOpen}
          onClose={() => setImageModalOpen(false)}
          src={message.media?.url}
          alt={message.media?.originalFilename || "Expanded image preview"}
        />
      </>
    )
  }

  return (
    <>
      <div
        id={`msg-${message.id}`}
        data-message-id={message.id}
        data-client-id={message.clientMessageId}
        className={cn(
          "relative flex w-full justify-end transition-all duration-150",
          isFirstInGroup ? "mt-2.5 sm:mt-3" : "mt-0.5",
          isLastInGroup ? "mb-1 sm:mb-1.5" : "mb-0.5"
        )}
      >
        <div className="group/msg relative flex max-w-[85%] flex-col items-end sm:max-w-[70%]">
          {forwardedBadge}
          {replyQuote}
          {body}

          <MessageReactions
            reactions={reactions}
            currentUserId={currentUserId}
            messageId={message.id}
            isCurrentUser={true}
            onReact={onReact}
          />

          {timestampAndStatus}

          <MessageActions
            isCurrentUser={true}
            canAct={canAct}
            onReact={handleSelectReaction}
            onReply={() => onReply?.(message)}
            onCopy={handleCopy}
            onForward={handleForward}
            onDelete={onDelete ? () => onDelete(message.id) : undefined}
            position="right"
          />
        </div>
      </div>

      <ImageLightbox
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        src={message.media?.url}
        alt={message.media?.originalFilename || "Expanded image preview"}
      />
    </>
  )
}

export { MessageBubble }