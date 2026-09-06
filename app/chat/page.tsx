"use client";

import { Logo } from "@/components/logo/logo";

export default function ChatIndexPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
      <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-3xl mb-3 border border-primary/20 p-3 shadow-xs">
        <Logo className="size-10 text-primary" />
      </div>
      <h3 className="font-semibold text-base text-foreground mb-1">
        Select a conversation
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm">
        Choose an existing chat from the left sidebar or start a new direct conversation to begin messaging.
      </p>
    </div>
  );
}

