"use client"

import * as React from "react"
import { Search, X } from "lucide-react"
import { cn } from "cn"

/**
 * Search input with a leading search icon, optional clear button and
 * an optional trailing kbd hint (e.g. ⌘K).
 */
function SearchInput({
  className,
  value,
  onChange,
  onClear,
  placeholder,
  kbd,
  autoFocus,
  ...props
}: React.ComponentProps<"input"> & {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear?: () => void
  kbd?: string
}) {
  return (
    <div className={cn("relative flex w-full items-center", className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground"
      />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        data-slot="search-input"
        className="h-8 w-full rounded-lg border border-input bg-transparent pl-8 pr-7 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        {...props}
      />
      {value && onClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          title="Clear search"
          className="absolute right-2 flex size-4 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      ) : kbd ? (
        <kbd className="pointer-events-none absolute right-2 hidden items-center gap-0.5 rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shadow-xs sm:inline-flex">
          {kbd}
        </kbd>
      ) : null}
    </div>
  )
}

export { SearchInput }