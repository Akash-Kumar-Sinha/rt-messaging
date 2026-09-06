"use client"

import { useState, useRef, useEffect } from "react"
import { SmilePlus, Reply, MoreHorizontal, Copy, Check, Share2, Trash2 } from "lucide-react"
import { cn } from "cn"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { QUICK_REACTIONS, EXTRA_REACTIONS } from "./message-types"

type MessageActionsProps = {
  isCurrentUser: boolean
  canAct: boolean
  /** Called with the chosen emoji; the caller binds the message id. */
  onReact?: (emoji: string) => void
  onReply?: () => void
  onCopy?: () => void
  onForward?: () => void
  onDelete?: () => void
  /** Side of the bubble the toolbar attaches to. */
  position?: "left" | "right"
}

/** Hover toolbar attached to a message bubble: quick reaction, reply, more menu. */
function MessageActions({
  isCurrentUser,
  canAct,
  onReact,
  onReply,
  onCopy,
  onForward,
  onDelete,
  position = "left",
}: MessageActionsProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [showExtraEmojis, setShowExtraEmojis] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close reaction pickers on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowReactionPicker(false)
        setShowExtraEmojis(false)
      }
    }
    if (showReactionPicker) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showReactionPicker])

  const handleCopy = () => {
    onCopy?.()
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (!canAct) return null

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "absolute -top-7.5 z-30 flex items-center gap-0.5 rounded-full border border-border/60 bg-card/95 px-1 py-0.5 opacity-0 shadow-md backdrop-blur-md transition-all duration-150 ease-out group-hover/msg:pointer-events-auto group-hover/msg:translate-y-0 group-hover/msg:scale-100 group-hover/msg:opacity-100 pointer-events-none scale-95 translate-y-1",
        position === "left" ? "left-0" : "right-0"
      )}
    >
      {/* Quick reaction trigger */}
      <button
        type="button"
        onClick={() => {
          setShowReactionPicker((prev) => !prev)
          setShowExtraEmojis(false)
        }}
        className="flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        title="Add reaction"
        aria-label="Add reaction"
      >
        <SmilePlus className="size-3.5" />
      </button>

      {/* Reply */}
      <button
        type="button"
        onClick={onReply}
        className="flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        title="Reply"
        aria-label="Reply"
      >
        <Reply className="size-3.5" />
      </button>

      {/* More actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              title="More actions"
              aria-label="More actions"
            />
          }
        >
          <MoreHorizontal className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isCurrentUser ? "end" : "start"}>
          <DropdownMenuItem onClick={() => onReply?.()}>
            <Reply className="opacity-80" />
            <span>Reply</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopy}>
            {copied ? (
              <Check className="text-primary opacity-90" />
            ) : (
              <Copy className="opacity-80" />
            )}
            <span>{copied ? "Copied" : "Copy"}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onForward?.()}>
            <Share2 className="opacity-80" />
            <span>Forward</span>
          </DropdownMenuItem>
          {isCurrentUser && onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete?.()}>
                <Trash2 className="opacity-80" />
                <span>Delete</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Quick reactions bar */}
      {showReactionPicker && (
        <div
          className={cn(
            "absolute bottom-full z-40 mb-1.5 flex items-center gap-1 rounded-full border border-border/60 bg-popover/95 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150",
            position === "right" ? "right-0" : "left-0"
          )}
        >
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onReact?.(emoji)
                setShowReactionPicker(false)
                setShowExtraEmojis(false)
              }}
              className="flex size-7 cursor-pointer items-center justify-center rounded-full text-base transition-transform duration-150 hover:scale-125 hover:bg-muted/60"
              title={emoji}
            >
              {emoji}
            </button>
          ))}

          {/* Extra emojis */}
          <button
            type="button"
            onClick={() => setShowExtraEmojis((prev) => !prev)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            title="More reactions"
            aria-label="More reactions"
          >
            <SmilePlus className="size-3.5" />
          </button>

          {showExtraEmojis && (
            <div className="absolute bottom-full left-0 z-50 mb-1 grid min-w-36 grid-cols-4 gap-1 rounded-xl border border-border/60 bg-popover p-2 shadow-2xl animate-in fade-in zoom-in-95">
              {EXTRA_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onReact?.(emoji)
                    setShowReactionPicker(false)
                    setShowExtraEmojis(false)
                  }}
                  className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-base transition-transform hover:scale-115 hover:bg-muted/60"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export { MessageActions }