"use client";

import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useState } from "react";
import { SettingsDialog } from "./SettingsDialog";

export function DemoBanner() {
  const { exitDemoMode } = useAppStore();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-4 py-2.5 flex items-center justify-between gap-4 sticky top-0 z-[60]">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium truncate">
            <span className="hidden sm:inline">You're viewing the demo with sample data. </span>
            <span className="sm:hidden">Demo mode. </span>
            <button
              onClick={() => setSettingsOpen(true)}
              className="underline hover:no-underline font-semibold"
            >
              Add your API keys
            </button>
            <span className="hidden sm:inline"> to use with live NYT articles.</span>
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={exitDemoMode}
          className="h-7 w-7 p-0 hover:bg-yellow-600 text-white flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
