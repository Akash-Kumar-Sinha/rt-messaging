"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

type IconButtonProps = React.ComponentProps<typeof Button> & {
  /** Accessible label (also shown as native title). Always required for icon-only buttons. */
  label: string
  /** Persistent "active/toggled" visual state (e.g. an open picker). */
  active?: boolean
}

/**
 * Icon-only button with a required accessible label. `active` renders the
 * accent surface used across the chat UI for toggled controls.
 */
function IconButton({
  label,
  active = false,
  variant = "ghost",
  size = "icon-sm",
  className,
  ...props
}: IconButtonProps) {
  return (
    <Button
      aria-label={label}
      title={label}
      data-active={active || undefined}
      variant={variant}
      size={size}
      className={cn(
        "text-muted-foreground transition-colors hover:text-foreground",
        active && "bg-accent text-foreground hover:bg-accent hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { IconButton }