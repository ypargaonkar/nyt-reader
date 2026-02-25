"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings, User, Moon, Sun, RefreshCw, Newspaper, Monitor, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SettingsDialog } from "./SettingsDialog";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Header({ onRefresh, isRefreshing }: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings, updateSettings, lastRefresh } = useAppStore();

  const cycleThemeMode = () => {
    const modes = ["system", "light", "dark"] as const;
    const currentIndex = modes.indexOf(settings.themeMode || "system");
    const nextMode = modes[(currentIndex + 1) % modes.length];
    updateSettings({ themeMode: nextMode });

    // Apply immediately
    if (nextMode === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", isDark);
    } else {
      document.documentElement.classList.toggle("dark", nextMode === "dark");
    }
  };

  const getThemeIcon = () => {
    const mode = settings.themeMode || "system";
    if (mode === "system") return <Monitor className="h-5 w-5" />;
    if (mode === "dark") return <Moon className="h-5 w-5" />;
    return <Sun className="h-5 w-5" />;
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 dark:bg-gray-950/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-950/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Left side: Logo */}
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center">
                <span className="font-serif text-xl font-bold tracking-tight">
                  <span className="text-gray-900 dark:text-white">The New York Times</span>
                  <span className="text-yellow-600 dark:text-yellow-500"> Reader</span>
                </span>
              </Link>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {/* Refresh button */}
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="h-11 w-11 touch-manipulation"
                  title={lastRefresh ? `Last refreshed: ${new Date(lastRefresh).toLocaleTimeString()}` : "Refresh articles"}
                >
                  <RefreshCw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
                </Button>
              )}

              {/* Games link */}
              <Link href="/games">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 touch-manipulation"
                  title="Games"
                >
                  <Gamepad2 className="h-5 w-5" />
                </Button>
              </Link>

              {/* Theme mode toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={cycleThemeMode}
                className="h-11 w-11 touch-manipulation"
                title={`Theme: ${settings.themeMode || "system"}`}
              >
                {getThemeIcon()}
              </Button>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-11 w-11 touch-manipulation">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
