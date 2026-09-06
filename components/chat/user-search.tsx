"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, X, ArrowRight, UserCheck } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { initialsOf, avatarSeedUrl } from "@/lib/messages";

export interface SearchedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  isOnline: boolean;
}

interface UserSearchProps {
  onSelectUser: (user: SearchedUser) => void | Promise<void>;
  excludeExisting?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
}

export function UserSearch({
  onSelectUser,
  excludeExisting = true,
  autoFocus = true,
  placeholder = "Search by username…",
}: UserSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [autoFocus]);

  // Debounced search effect with request cancellation
  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setLoading(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    setLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const url = `/api/users?q=${encodeURIComponent(trimmed)}&excludeExisting=${excludeExisting}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setResults(data.users || []);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("User search error:", err);
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, excludeExisting]);

  const handleSelect = useCallback(
    async (user: SearchedUser) => {
      if (selectedUserId) return;
      setSelectedUserId(user.id);
      try {
        await onSelectUser(user);
      } finally {
        setSelectedUserId(null);
      }
    },
    [onSelectUser, selectedUserId]
  );

  return (
    <div className="flex flex-col gap-0 overflow-hidden">
      {/* Search Input Bar */}
      <div className="flex items-center gap-2.5 border-b border-border/50 bg-background/50 px-3.5 py-2.5">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm font-normal text-foreground placeholder:text-muted-foreground selection:bg-muted focus:outline-none focus:ring-0"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {/* Results / Empty Viewports */}
      <ScrollArea className="max-h-[50vh] min-h-[160px] flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Searching users...</span>
          </div>
        ) : !query.trim() ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <div className="mb-2 flex size-10 items-center justify-center rounded-full border border-border/50 bg-secondary/40 text-muted-foreground">
              <Search className="size-4" />
            </div>
            <p className="text-xs font-semibold text-foreground">Search for someone to start a conversation</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/80">
              Type a username to find contacts and start chatting.
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <div className="mb-2 flex size-10 items-center justify-center rounded-full border border-border/50 bg-secondary/40 text-muted-foreground">
              <UserCheck className="size-4 opacity-70" />
            </div>
            <p className="text-xs font-semibold text-foreground">No users found</p>
            <p className="mt-0.5 max-w-xs text-center text-[11px] text-muted-foreground/80">
              No matching username found for &ldquo;<span className="font-mono text-foreground">{query}</span>&rdquo;.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 p-2">
            {results.map((user) => {
              const isSelected = selectedUserId === user.id;
              const avatar = user.avatarUrl || avatarSeedUrl(user.id);

              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelect(user)}
                  disabled={!!selectedUserId}
                  className="group flex w-full cursor-pointer items-center justify-between rounded-xl p-2.5 px-3 text-left transition-colors duration-150 hover:bg-secondary/60 disabled:opacity-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative shrink-0">
                      <Avatar size="sm" className="border border-border/50">
                        <AvatarImage src={avatar} alt={user.displayName} />
                        <AvatarFallback className="text-[10px] font-medium">
                          {initialsOf(user.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      {user.isOnline && (
                        <StatusIndicator
                          status="online"
                          className="absolute right-0 bottom-0 border-2 border-card"
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate text-xs font-semibold text-foreground">
                          {user.displayName}
                        </h4>
                        {user.isOnline && (
                          <span className="text-[10px] font-medium text-primary">● Online</span>
                        )}
                      </div>
                      <p className="truncate font-mono text-[11px] text-muted-foreground/80">
                        @{user.username}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 text-muted-foreground group-hover:text-foreground">
                    {isSelected ? (
                      <Loader2 className="size-3.5 animate-spin text-primary" />
                    ) : (
                      <ArrowRight className="size-3.5 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
