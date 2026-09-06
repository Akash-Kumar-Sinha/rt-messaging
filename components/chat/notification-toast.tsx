"use client";

import React, { useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { X, MessageSquare, ArrowRight, UserPlus } from "lucide-react";

export interface NotificationItem {
  id: string;
  type: "FRIEND_ADDED" | "MESSAGE" | "SYSTEM";
  title: string;
  body: string;
  conversationId?: string;
  avatarUrl?: string;
  senderName?: string;
}

interface NotificationToastProps {
  notification: NotificationItem | null;
  onOpen: (conversationId: string) => void;
  onDismiss: () => void;
}

export function NotificationToast({
  notification,
  onOpen,
  onDismiss,
}: NotificationToastProps) {
  useEffect(() => {
    if (!notification) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, 6000);

    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  return (
    <div className="pointer-events-auto fixed top-4 right-4 z-50 w-full max-w-sm animate-in fade-in slide-in-from-top-3 duration-200">
      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-lg">
        <div className="relative shrink-0">
          {notification.avatarUrl ? (
            <Avatar className="size-8 border border-border">
              <AvatarImage src={notification.avatarUrl} alt={notification.title} />
              <AvatarFallback className="text-[10px]">
                {notification.senderName
                  ? notification.senderName.substring(0, 2).toUpperCase()
                  : "U"}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-foreground">
              {notification.type === "FRIEND_ADDED" ? (
                <UserPlus className="size-4" />
              ) : (
                <MessageSquare className="size-4" />
              )}
            </div>
          )}
          <StatusIndicator
            status="online"
            size="sm"
            className="absolute -right-0.5 -bottom-0.5 ring-2 ring-card"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <h4 className="truncate text-xs font-semibold leading-snug text-foreground">
              {notification.title}
            </h4>
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70">
              Just now
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-2 break-words">
            {notification.body}
          </p>

          <div className="mt-2 flex items-center gap-1.5">
            {notification.conversationId && (
              <Button
                size="xs"
                onClick={() => {
                  if (notification.conversationId) {
                    onOpen(notification.conversationId);
                  }
                  onDismiss();
                }}
                className="h-6 gap-1 rounded-md px-2 text-[11px] font-medium"
              >
                <span>Open Chat</span>
                <ArrowRight className="size-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="xs"
              onClick={onDismiss}
              className="h-6 rounded-md px-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Dismiss
            </Button>
          </div>
        </div>

        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={onDismiss}
          className="-mt-0.5 -mr-0.5 flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}