"use client"

import { toast } from "@/components/ui/toast"
import type { MessageItem } from "./message-types"

type MessageReplyProps = {
  replyTo: NonNullable<MessageItem["metadata"]>["replyTo"] & {
    id?: string
    clientMessageId?: string
  }
  /** Which side of the quote the accent border sits on. */
  isCurrentUser?: boolean
}

/** Clickable "Replying to ..." quote banner that jumps to the original message. */
function MessageReply({ replyTo, isCurrentUser = false }: MessageReplyProps) {
  const handleScrollToReply = (e: React.MouseEvent) => {
    e.stopPropagation()
    const targetId = replyTo?.id
    if (!targetId) return

    const targetEl =
      document.getElementById(`msg-${targetId}`) ||
      document.getElementById(`msg-${replyTo?.clientMessageId}`) ||
      document.querySelector(`[data-message-id="${targetId}"]`) ||
      document.querySelector(`[data-client-id="${targetId}"]`)

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" })
      targetEl.classList.remove("highlight-pulse")
      void (targetEl as HTMLElement).offsetWidth
      targetEl.classList.add("highlight-pulse")
      setTimeout(() => {
        targetEl.classList.remove("highlight-pulse")
      }, 2000)
    } else {
      toast.add({
        title: "Message above",
        description: "The replied message is further up in conversation history.",
        type: "info",
      })
    }
  }

  return (
    <div
      onClick={handleScrollToReply}
      title="Click to jump to replied message"
      data-slot="message-reply"
      className={`mb-1 flex max-w-xs cursor-pointer truncate border-border bg-secondary/80 px-2.5 py-1 text-xs text-muted-foreground shadow-xs transition-all duration-150 hover:bg-secondary active:scale-98 group/quote ${
        isCurrentUser
          ? "self-end rounded-l-lg border-r-2 text-right"
          : "self-start rounded-r-lg border-l-2"
      }`}
    >
      <div className="min-w-0">
        <span className="block text-[10px] font-semibold text-foreground group-hover/quote:underline">
          ↩ {replyTo?.senderName}
        </span>
        <span className="block truncate text-[11px]">{replyTo?.content}</span>
      </div>
    </div>
  )
}

export { MessageReply }