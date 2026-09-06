"use client";

import { AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "cn";
import type { FailureReason } from "./message-types";

interface FailedMessageCardProps {
  reason?: FailureReason | string;
  className?: string;
}

/**
 * Compact sender-side failed state rendered when a message fails moderation/profanity check.
 * Strictly avoids rendering prohibited text or raw moderation keywords.
 */
export function FailedMessageCard({ reason = "PROFANITY_REJECTED", className }: FailedMessageCardProps) {
  const isProfanity = reason === "PROFANITY_REJECTED";
  const isModerationFailed = reason === "MODERATION_FAILED";
  const isRateLimited = reason === "RATE_LIMITED";

  const title = isProfanity
    ? "Message not sent"
    : isModerationFailed
    ? "Message couldn't be sent"
    : isRateLimited
    ? "Message not sent"
    : "Message not sent";

  const description = isProfanity
    ? "Prohibited language detected"
    : isModerationFailed
    ? "Please try again."
    : isRateLimited
    ? "Sending too quickly. Try again in a few seconds."
    : "Unable to deliver message";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(
        "flex w-fit max-w-[280px] items-start gap-2.5 rounded-2xl border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-left shadow-xs select-none",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-semibold text-destructive leading-tight">
          {title}
        </span>
        <span className="text-[11px] text-muted-foreground leading-tight">
          {description}
        </span>
      </div>
    </motion.div>
  );
}
