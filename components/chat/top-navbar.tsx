"use client";

import { useChat } from "./chat-context";
import { Logo } from "@/components/logo/logo";
import { UserSettingsPopover } from "./user-settings-popover";

export function TopNavbar() {
  const { currentUser, logout } = useChat();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/40 bg-background/80 px-4 backdrop-blur-md z-30">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="flex size-7 items-center justify-center rounded-lg border border-border/60 bg-muted/40 p-1 text-primary shadow-2xs">
          <Logo className="size-4.5 text-primary" />
        </div>
        <span className="text-xs font-semibold tracking-tight text-foreground">
          SignalPulse RT
        </span>
      </div>

      {/* User Profile & Settings */}
      <div className="flex items-center">
        <UserSettingsPopover user={currentUser} onLogout={logout} />
      </div>
    </header>
  );
}