"use client";

import { UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UserSearch, SearchedUser } from "./user-search";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: SearchedUser) => void | Promise<void>;
  excludeExisting?: boolean;
}

export function NewChatModal({
  isOpen,
  onClose,
  onSelectUser,
  excludeExisting = true,
}: NewChatModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden border border-border/60 bg-card/95 p-0 shadow-2xl backdrop-blur-md sm:max-w-md">
        <DialogHeader className="p-4 pb-3">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <div className="flex size-7 items-center justify-center rounded-lg border border-border/50 bg-secondary/60 text-foreground">
              <UserPlus className="size-3.5" />
            </div>
            <span>Start a New Chat</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Search for any user by their handle to start a direct real-time conversation.
          </DialogDescription>
        </DialogHeader>

        <UserSearch
          onSelectUser={onSelectUser}
          excludeExisting={excludeExisting}
          autoFocus={true}
        />
      </DialogContent>
    </Dialog>
  );
}
