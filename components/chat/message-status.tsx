"use client"

import { Check, CheckCheck, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { MessageItem } from "./message-types"

type MessageStatusProps = {
  status: MessageItem["status"]
  errorReason?: string | null
  failureReason?: MessageItem["failureReason"]
  onRetry?: (message: MessageItem) => void
  message?: MessageItem
}

/** Delivery/read state for outgoing messages: pending, sent, delivered, read, failed. */
function MessageStatus({
  status,
  errorReason,
  failureReason,
  onRetry,
  message,
}: MessageStatusProps) {
  if (status === "PENDING") {
    return (
      <span className="inline-flex items-center text-[10px] text-muted-foreground animate-pulse">
        <Loader2 className="size-2.5" aria-hidden="true" />
      </span>
    )
  }

  if (status === "FAILED") {
    // Profanity and moderation failures are presented cleanly by the FailedMessageCard.
    // Omit duplicate red text and retry button.
    const isModerationRejection =
      failureReason === "PROFANITY_REJECTED" ||
      failureReason === "MODERATION_FAILED" ||
      message?.failureReason === "PROFANITY_REJECTED" ||
      message?.failureReason === "MODERATION_FAILED"

    if (isModerationRejection) {
      return null
    }

    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-destructive">
        <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
        <span>{errorReason || "Failed to deliver"}</span>
        {onRetry && message && (
          <Button
            variant="destructive"
            size="xs"
            onClick={() => onRetry(message)}
            className="ml-2 h-6 px-2 text-[11px]"
          >
            <RefreshCw className="size-3" data-icon="inline-start" />
            Retry
          </Button>
        )}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center">
      {status === "SENT" && <Check className="size-3 opacity-70" aria-label="Sent" />}
      {status === "DELIVERED" && <CheckCheck className="size-3 opacity-70" aria-label="Delivered" />}
      {status === "READ" && <CheckCheck className="size-3 text-primary" aria-label="Read" />}
    </span>
  )
}

export { MessageStatus }