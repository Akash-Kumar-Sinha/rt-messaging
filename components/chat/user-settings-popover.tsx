"use client";

import { Sun, Moon, LogOut, ChevronDown, Settings } from "lucide-react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { SessionUser } from "@/lib/auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { initialsOf, avatarSeedUrl } from "@/lib/messages";

interface UserSettingsPopoverProps {
  user: SessionUser;
  onLogout: () => Promise<void>;
}

export function UserSettingsPopover({ user, onLogout }: UserSettingsPopoverProps) {
  const initials = initialsOf(user.displayName || user.username);
  const avatarUrl = user.avatarUrl || avatarSeedUrl(user.username);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-transparent p-1 transition-all select-none hover:border-border/50 hover:bg-muted/50 sm:px-2 sm:py-1"
            title="Account & Settings"
            aria-label="Account & Settings"
          />
        }
      >
        <div className="relative shrink-0">
          <Avatar size="sm" className="border border-border/50">
            <AvatarImage src={avatarUrl} alt={user.displayName} />
            <AvatarFallback className="text-[10px] font-medium">{initials}</AvatarFallback>
          </Avatar>
          <StatusIndicator
            status="online"
            size="sm"
            className="absolute right-0 bottom-0 border border-card"
          />
        </div>

        <div className="hidden flex-col text-left leading-tight sm:flex">
          <span className="max-w-28 truncate text-xs font-semibold text-foreground">
            {user.displayName}
          </span>
          <span className="truncate text-[10px] text-muted-foreground/80">@{user.username}</span>
        </div>

        <ChevronDown className="hidden size-3 text-muted-foreground transition-transform duration-200 sm:block" />
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-56 gap-0 border border-border/60 bg-card/95 p-1.5 text-xs shadow-2xl backdrop-blur-md">
        {/* User Header */}
        <div className="flex items-center gap-2.5 border-b border-border/40 p-2.5 px-3">
          <Avatar size="default" className="shrink-0 border border-border/50">
            <AvatarImage src={avatarUrl} alt={user.displayName} />
            <AvatarFallback className="font-medium">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-xs font-semibold text-foreground">{user.displayName}</h4>
            <p className="truncate font-mono text-[11px] text-muted-foreground/80">@{user.username}</p>
          </div>
        </div>

        {/* Preferences Section Header */}
        <div className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          <Settings className="size-3" />
          <span>Preferences</span>
        </div>

        {/* Theme Toggle Preference */}
        <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted/50">
          <div className="flex items-center gap-2">
            <Sun className="hidden size-3.5 text-muted-foreground dark:block" />
            <Moon className="block size-3.5 text-muted-foreground dark:hidden" />
            <span>Theme Mode</span>
          </div>
          <AnimatedThemeToggler
            variant="circle"
            className="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-border/50 bg-secondary/50 text-muted-foreground shadow-xs transition-all hover:bg-secondary hover:text-foreground [&_svg]:size-3.5"
            title="Toggle Dark / Light Theme"
          />
        </div>

        <div className="my-1 h-px bg-border/40" />

        {/* Sign Out */}
        <button
          type="button"
          onClick={async () => {
            await onLogout();
          }}
          className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="size-3.5" />
          <span>Sign out</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}