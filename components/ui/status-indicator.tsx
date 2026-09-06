import { cn } from "cn"

const statusVariants = {
  online: "bg-primary",
  offline: "bg-muted-foreground/30",
  connecting: "bg-muted-foreground animate-pulse",
  danger: "bg-destructive",
} as const

const statusSizes = {
  sm: "size-2",
  md: "size-2.5",
  lg: "size-3",
} as const

/**
 * Small semantic presence dot. `online` maps to the theme's primary token
 * so it automatically adapts to light/dark mode.
 */
function StatusIndicator({
  status,
  size = "md",
  className,
  withRing = false,
  ...props
}: React.ComponentProps<"span"> & {
  status: keyof typeof statusVariants
  size?: keyof typeof statusSizes
  /** Adds a ring matching the surface behind the dot (e.g. avatar containers). */
  withRing?: boolean
}) {
  return (
    <span
      data-slot="status-indicator"
      data-status={status}
      data-size={size}
      aria-hidden="true"
      className={cn(
        "inline-block shrink-0 rounded-full",
        statusVariants[status],
        statusSizes[size],
        withRing && "ring-2 ring-background",
        className
      )}
      {...props}
    />
  )
}

export { StatusIndicator }