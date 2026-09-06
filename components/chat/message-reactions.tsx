"use client"

import { cn } from "cn"

type MessageReactionsProps = {
  reactions: Record<string, string[]>
  currentUserId?: string
  isCurrentUser?: boolean
  onReact?: (messageId: string, emoji: string) => void
  messageId: string
}

/** Reaction pills rendered under a message. Toggling calls onReact. */
function MessageReactions({
  reactions,
  currentUserId,
  isCurrentUser = false,
  onReact,
  messageId,
}: MessageReactionsProps) {
  const entries = Object.entries(reactions)
  if (entries.length === 0) return null

  return (
    <div
      data-slot="message-reactions"
      className={cn("z-10 mt-1 flex flex-wrap items-center gap-1", isCurrentUser && "justify-end")}
    >
      {entries.map(([emoji, userIds]) => {
        const hasReacted = currentUserId ? userIds.includes(currentUserId) : false
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onReact?.(messageId, emoji)}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-all animate-in fade-in zoom-in-95 duration-150 hover:scale-110 active:scale-90",
              hasReacted
                ? "border-border bg-accent font-medium text-foreground"
                : "border-border bg-secondary text-secondary-foreground hover:bg-muted"
            )}
            title={userIds.length > 1 ? `${userIds.length} reactions` : "1 reaction"}
          >
            <span className="text-xs leading-none" aria-hidden="true">{emoji}</span>
            <span className="text-[10px] font-semibold opacity-90">{userIds.length}</span>
          </button>
        )
      })}
    </div>
  )
}

export { MessageReactions }