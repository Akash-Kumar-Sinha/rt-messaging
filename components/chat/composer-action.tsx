"use client"

import * as React from "react"
import { cn } from "cn"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type ComposerActionProps = {
  /** Accessible label, shown in the tooltip and read by screen readers. */
  label: string
  /** Icon (or text content for e.g. the "GIF" button). */
  children: React.ReactNode
  onClick: () => void
  /** Toggled state while its picker is open. */
  active?: boolean
  disabled?: boolean
  className?: string
}

/**
 * Consistent action control inside the chat composer (attach media, GIF,
 * stickers, emoji). Uniform sizing, hover/active states, tooltip, and
 * disabled handling in one place.
 */
function ComposerAction({
  label,
  children,
  onClick,
  active = false,
  disabled = false,
  className,
}: ComposerActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={active}
            data-active={active || undefined}
            className={cn(
              "flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-[7px] px-1.5 text-muted-foreground transition-colors select-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent",
              active
                ? "bg-accent font-semibold text-foreground"
                : "hover:bg-muted hover:text-foreground",
              className
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}

export { ComposerAction }