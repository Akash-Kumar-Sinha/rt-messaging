"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "cn"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SearchInput } from "@/components/ui/search-input"
import { IconButton } from "@/components/ui/icon-button"

/**
 * Shared popup shell for the GIF / sticker / emoji pickers.
 * Anchored above its trigger (composer). All three pickers reuse this
 * surface so headers, search, tabs and scroll behavior stay consistent.
 */

type PickerSurfaceProps = React.ComponentProps<"div"> & {
  /** Picker title shown in the header (e.g. "GIF", "Stickers", "Emoji"). */
  title: string
  onClose: () => void
}

function PickerSurface({ title, onClose, className, children, ...props }: PickerSurfaceProps) {
  // Close on Escape (centralized for every picker)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  return (
    <div
      data-slot="picker-surface"
      className={cn(
        "absolute bottom-full mb-3 left-0 z-50 flex h-[390px] w-[350px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl shadow-black/50 animate-in fade-in zoom-in-95 duration-150 sm:w-[390px]",
        className
      )}
      {...props}
    >
      <PickerHeader title={title} onClose={onClose} />
      {children}
    </div>
  )
}

function PickerHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex shrink-0 items-center justify-between px-3.5 py-2.5">
      <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">{title}</span>
      <IconButton label="Close picker" size="icon-xs" onClick={onClose} className="size-6 rounded-md">
        <X className="size-3.5" />
      </IconButton>
    </div>
  )
}

function PickerSearch({
  value,
  onChange,
  onClear,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  onClear?: () => void
  placeholder: string
}) {
  return (
    <div className="shrink-0 px-3.5 pb-2.5">
      <SearchInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClear={onClear}
        placeholder={placeholder}
        className="[&>input]:h-[34px] [&>input]:rounded-lg [&>input]:bg-background/60 [&>input]:border-border/50"
        autoFocus
      />
    </div>
  )
}

function PickerTabs({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="picker-tabs"
      className={cn(
        "no-scrollbar flex shrink-0 items-center gap-1.5 overflow-x-auto px-3.5 pb-2 text-[11px]",
        className
      )}
      {...props}
    />
  )
}

function PickerTab({
  active,
  className,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      data-active={active || undefined}
      className={cn(
        "inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-md border px-2.5 font-medium whitespace-nowrap transition-colors",
        active
          ? "border-border/50 bg-secondary font-semibold text-foreground shadow-xs"
          : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function PickerContent({ className, ...props }: React.ComponentProps<typeof ScrollArea>) {
  return (
    <ScrollArea
      data-slot="picker-content"
      className={cn("min-h-0 flex-1 px-3.5 pb-3", className)}
      {...props}
    />
  )
}

export { PickerSurface, PickerHeader, PickerSearch, PickerTabs, PickerTab, PickerContent }